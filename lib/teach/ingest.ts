// TEACH EMIL — source acquisition.
// Fetches ONLY publicly available material over plain HTTPS GET requests.
// Never bypasses paywalls, logins, DRM or robots gates: if a page does not
// return readable content to an anonymous request, the source is stored with
// whatever metadata is available and marked accordingly.

export type FetchedSource = {
  sourceType: 'youtube' | 'article'
  title: string
  author?: string
  publishedAt?: Date
  durationSec?: number
  extractedText?: string
  metadata?: Record<string, any>
  fetchError?: string
}

const MAX_TEXT = 60_000 // cap stored/analyzed text
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EMIL-Research/1.0'

const timeoutFetch = async (url: string, init: RequestInit = {}, ms = 15000): Promise<Response> => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/json,*/*', ...(init.headers ?? {}) },
    })
  } finally {
    clearTimeout(t)
  }
}

// Basic SSRF guard: public http(s) URLs only.
export function isSafePublicUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number)
    if (a === 127 || a === 10 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)) return false
  }
  if (host === '[::1]' || host.startsWith('fd') || host.startsWith('fe80')) return false
  return true
}

export function extractYouTubeId(raw: string): string | null {
  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(shorts|live|embed)\/([A-Za-z0-9_-]{6,})/)
      if (m) return m[2]
    }
    return null
  } catch {
    return null
  }
}

export function classifyUrl(raw: string): 'youtube' | 'article' {
  return extractYouTubeId(raw) ? 'youtube' : 'article'
}

const stripTags = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n')
    .trim()

// ---- YouTube: oEmbed metadata + captions via the public innertube player API.
// The classic timedtext URLs from the watch page now return empty bodies to
// server-side fetches; the innertube player endpoint (the same API the mobile
// apps use for publicly available videos) serves working caption URLs.

function parseTimedText(xml: string): string {
  const parts: string[] = []
  const stamp = (ms: number) => {
    const secs = Math.floor(ms / 1000)
    return `[${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}]`
  }
  // format=3 timedtext: <p t="ms" d="ms">…</p> (word-level <s> segments inside)
  const pRe = /<p[^>]*\bt="(\d+)"[^>]*>([\s\S]*?)<\/p>/g
  let m: RegExpExecArray | null
  while ((m = pRe.exec(xml)) !== null) {
    const line = stripTags(m[2]).replace(/\s+/g, ' ').trim()
    if (line) parts.push(`${stamp(parseInt(m[1], 10))} ${line}`)
  }
  if (parts.length) return parts.join('\n')
  // legacy format: <text start="s" dur="s">…</text>
  const tRe = /<text[^>]*start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g
  while ((m = tRe.exec(xml)) !== null) {
    const line = stripTags(m[2]).replace(/\s+/g, ' ').trim()
    if (line) parts.push(`${stamp(parseFloat(m[1]) * 1000)} ${line}`)
  }
  return parts.join('\n')
}

async function fetchYouTube(url: string, videoId: string): Promise<FetchedSource> {
  const out: FetchedSource = { sourceType: 'youtube', title: `YouTube video ${videoId}`, metadata: { videoId } }
  // 1. oEmbed — official public metadata endpoint, no key required.
  try {
    const res = await timeoutFetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`)
    if (res.ok) {
      const d = await res.json()
      if (d?.title) out.title = d.title
      if (d?.author_name) out.author = d.author_name
      out.metadata = { ...out.metadata, oembed: { title: d?.title, author: d?.author_name, authorUrl: d?.author_url } }
    }
  } catch {
    /* metadata optional */
  }
  // 2. Innertube player — duration, description, publish date, caption tracks.
  try {
    const res = await timeoutFetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30, hl: 'en' } },
        videoId,
      }),
    })
    const d = res.ok ? await res.json().catch(() => null) : null
    const status = d?.playabilityStatus?.status
    if (status && status !== 'OK') {
      // LOGIN_REQUIRED from a cloud server usually means YouTube's bot
      // protection blocked the datacenter IP — the video itself is public.
      out.fetchError = status === 'LOGIN_REQUIRED'
        ? 'YouTube restricted transcript access from EMIL’s cloud servers (datacenter bot protection) — analysis used title/channel metadata only. A dedicated transcript service is on the roadmap.'
        : `Video is not publicly playable (${status}) — EMIL only analyzes publicly available material.`
      if (status === 'LOGIN_REQUIRED') return out
      return out
    }
    const vd = d?.videoDetails
    if (vd?.title && (!out.title || out.title.startsWith('YouTube video'))) out.title = vd.title
    if (vd?.author && !out.author) out.author = vd.author
    if (vd?.lengthSeconds) out.durationSec = parseInt(vd.lengthSeconds, 10)
    const pub = d?.microformat?.playerMicroformatRenderer?.publishDate
    if (pub) {
      const pd = new Date(pub)
      if (!isNaN(pd.getTime())) out.publishedAt = pd
    }
    if (vd?.shortDescription) out.metadata = { ...out.metadata, description: String(vd.shortDescription).slice(0, 2000) }

    const tracks: any[] = d?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
    const track = tracks.find((t) => (t?.languageCode ?? '').startsWith('en') && t?.kind !== 'asr')
      ?? tracks.find((t) => (t?.languageCode ?? '').startsWith('en'))
      ?? tracks[0]
    if (track?.baseUrl) {
      const cap = await timeoutFetch(track.baseUrl, { headers: { 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip' } })
      const xml = cap.ok ? await cap.text() : ''
      const text = xml ? parseTimedText(xml) : ''
      if (text) {
        out.extractedText = text.slice(0, MAX_TEXT)
        out.metadata = { ...out.metadata, captionLanguage: track?.languageCode, captionKind: track?.kind ?? 'manual', captionChars: text.length }
      }
    }
    if (!out.extractedText) {
      out.fetchError = 'No usable captions/transcript available for this video — analysis is limited to title, channel and description metadata.'
    }
  } catch (e: any) {
    out.fetchError = e?.name === 'AbortError' ? 'YouTube fetch timed out.' : `YouTube fetch failed: ${e?.message ?? 'network error'}.`
  }
  return out
}

// ---- Articles / research pages ----

async function fetchArticle(url: string): Promise<FetchedSource> {
  const out: FetchedSource = { sourceType: 'article', title: url }
  try {
    const res = await timeoutFetch(url)
    if (!res.ok) {
      out.fetchError = `Page responded ${res.status}${res.status === 401 || res.status === 403 ? ' — content is access-restricted and will not be bypassed' : ''}.`
      return out
    }
    const ctype = res.headers.get('content-type') ?? ''
    if (!ctype.includes('html') && !ctype.includes('text') && !ctype.includes('json') && !ctype.includes('xml')) {
      out.fetchError = `Unsupported content type "${ctype}". Upload the file through the Upload panel instead.`
      return out
    }
    const html = (await res.text()).slice(0, 900_000)
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (t) out.title = stripTags(t[1]).slice(0, 300) || url
    const author = html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i) ?? html.match(/<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i)
    if (author) out.author = author[1].slice(0, 200)
    const pub = html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)
    if (pub) {
      const d = new Date(pub[1])
      if (!isNaN(d.getTime())) out.publishedAt = d
    }
    // Prefer <article>/<main> body when present.
    const bodyMatch = html.match(/<article[\s\S]*?<\/article>/i) ?? html.match(/<main[\s\S]*?<\/main>/i)
    const text = stripTags(bodyMatch ? bodyMatch[0] : html)
    if (text.length < 200) {
      out.fetchError = 'Page returned almost no readable text (likely a JS-only app or gated content).'
    }
    out.extractedText = text.slice(0, MAX_TEXT)
    out.metadata = { contentType: ctype, htmlBytes: html.length, textChars: text.length }
  } catch (e: any) {
    out.fetchError = e?.name === 'AbortError' ? 'Page fetch timed out.' : `Fetch failed: ${e?.message ?? 'network error'}.`
  }
  return out
}

export async function fetchSourceContent(url: string): Promise<FetchedSource> {
  const videoId = extractYouTubeId(url)
  if (videoId) return fetchYouTube(url, videoId)
  return fetchArticle(url)
}
