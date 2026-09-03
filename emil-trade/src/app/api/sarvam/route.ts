// ═══════════════════════════════════════════════════════════════
// Lara language-services proxy — server-side only.
// The API key lives in the SARVAM_API_KEY environment variable and is
// never exposed to the client. When the key is absent the route reports
// {configured:false} honestly — the client's default rule-based English
// parser remains fully functional without it. Lara failure must never
// affect the core platform: errors here return structured fallbacks.
// No credentials, tokens or personal data beyond the submitted text are
// forwarded; nothing is logged server-side.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

const SARVAM_BASE = 'https://api.sarvam.ai';
const TIMEOUT_MS = 8000;

interface LaraBody {
  action: 'health' | 'translate' | 'detect' | 'stt' | 'tts';
  text?: string;
  targetLang?: string; // BCP-47 style codes Lara accepts, e.g. en-IN, hi-IN, ta-IN
  sourceLang?: string;
  audioBase64?: string; // WAV audio for speech-to-text-translate
}

async function sarvamFetch(path: string, key: string, payload: Record<string, unknown>): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${SARVAM_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const key = process.env.SARVAM_API_KEY;
  let body: LaraBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 }); }

  if (body.action === 'health') {
    return NextResponse.json({ ok: true, configured: !!key });
  }
  if (!key) {
    return NextResponse.json({ ok: false, configured: false, error: 'Lara is not configured on the server (SARVAM_API_KEY missing). The default English rule parser remains active.' }, { status: 503 });
  }

  // Voice: speech-to-text-translate — transcribes AND translates to English
  // in one hop, so the SAME deterministic rule parser handles the result.
  if (body.action === 'stt') {
    const b64 = body.audioBase64 ?? '';
    if (!b64 || b64.length > 8_000_000) return NextResponse.json({ ok: false, error: 'missing or oversized audio' }, { status: 400 });
    try {
      const bytes = Buffer.from(b64, 'base64');
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(bytes)], { type: 'audio/wav' }), 'command.wav');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20_000);
      let r: Response;
      try {
        r = await fetch(`${SARVAM_BASE}/speech-to-text-translate`, {
          method: 'POST', headers: { 'api-subscription-key': key }, body: form, signal: ctrl.signal,
        });
      } finally { clearTimeout(timer); }
      if (!r.ok) return NextResponse.json({ ok: false, configured: true, error: `Lara speech failed (${r.status})` }, { status: 502 });
      const j = await r.json();
      return NextResponse.json({ ok: true, configured: true, transcript: j.transcript ?? null, language: j.language_code ?? null });
    } catch (err) {
      return NextResponse.json({ ok: false, configured: true, error: err instanceof Error && err.name === 'AbortError' ? 'Lara speech timed out' : 'Lara speech unreachable' }, { status: 502 });
    }
  }

  const text = (body.text ?? '').slice(0, 2000);
  if (!text.trim()) return NextResponse.json({ ok: false, error: 'empty text' }, { status: 400 });

  try {
    if (body.action === 'detect') {
      const r = await sarvamFetch('/text-lid', key, { input: text });
      if (!r.ok) return NextResponse.json({ ok: false, configured: true, error: `Lara detect failed (${r.status})` }, { status: 502 });
      const j = await r.json();
      return NextResponse.json({ ok: true, configured: true, language: j.language_code ?? null, script: j.script_code ?? null });
    }
    // Voice output: text-to-speech read-backs (critical numbers stay exact —
    // the caller passes the final display string verbatim).
    if (body.action === 'tts') {
      const r = await sarvamFetch('/text-to-speech', key, {
        text: text.slice(0, 500),
        target_language_code: body.targetLang ?? 'en-IN',
      });
      if (!r.ok) return NextResponse.json({ ok: false, configured: true, error: `Lara speech-out failed (${r.status})` }, { status: 502 });
      const j = await r.json();
      const audio = Array.isArray(j.audios) ? j.audios[0] : null;
      if (!audio) return NextResponse.json({ ok: false, configured: true, error: 'Lara returned no audio' }, { status: 502 });
      return NextResponse.json({ ok: true, configured: true, audioBase64: audio });
    }
    if (body.action === 'translate') {
      // Lara needs an explicit (or detectable) source language and rejects
      // unknown fields — the client passes its locally-detected script code.
      const r = await sarvamFetch('/translate', key, {
        input: text,
        source_language_code: body.sourceLang || 'auto',
        target_language_code: body.targetLang ?? 'en-IN',
      });
      if (!r.ok) {
        const detail = await r.text().catch(() => '');
        const hint = detail.includes('Unable to detect') ? ' — the language could not be auto-detected; type in the native script or English' : '';
        return NextResponse.json({ ok: false, configured: true, error: `Lara translate failed (${r.status})${hint}` }, { status: 502 });
      }
      const j = await r.json();
      return NextResponse.json({ ok: true, configured: true, translated: j.translated_text ?? null, sourceLang: j.source_language_code ?? null });
    }
    return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, configured: true, error: err instanceof Error && err.name === 'AbortError' ? 'Lara timed out' : 'Lara unreachable' }, { status: 502 });
  }
}
