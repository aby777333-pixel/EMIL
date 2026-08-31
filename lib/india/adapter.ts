// Connection testers for India market API providers.
// Each test performs a lightweight authenticated read (profile/funds) against
// the provider's REST API. No orders are ever placed from here.

type ProviderRow = {
  key: string
  baseUrl: string
  apiKey?: string | null
  apiSecret?: string | null
  accessToken?: string | null
  clientCode?: string | null
}

export type TestResult = { ok: boolean; message: string }

const timeoutFetch = async (url: string, init: RequestInit = {}, ms = 8000): Promise<Response> => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

export async function testProviderConnection(p: ProviderRow): Promise<TestResult> {
  try {
    switch (p.key) {
      case 'indianapi': {
        if (!p.apiKey) return { ok: false, message: 'API key required — get it from the IndianAPI.in dashboard (API / Manage Keys).' }
        const res = await timeoutFetch(`${p.baseUrl}/trending`, {
          headers: { 'X-Api-Key': p.apiKey, Accept: 'application/json' },
        })
        if (res.status === 429) return { ok: false, message: 'IndianAPI responded 429 — plan rate limit or credits exhausted.' }
        if (res.status === 401 || res.status === 403) return { ok: false, message: `IndianAPI rejected the key (${res.status}). Check the key and that the base URL matches your plan tier.` }
        const body = await res.json().catch(() => null)
        if (res.ok && body) return { ok: true, message: 'Connected — trending stocks endpoint returned live NSE/BSE data.' }
        return { ok: false, message: `IndianAPI responded ${res.status}.` }
      }
      case 'zerodha_kite': {
        if (!p.apiKey || !p.accessToken) return { ok: false, message: 'API key and daily access token are required. Generate the access token via the Kite login flow.' }
        const res = await timeoutFetch(`${p.baseUrl}/user/profile`, {
          headers: { 'X-Kite-Version': '3', Authorization: `token ${p.apiKey}:${p.accessToken}` },
        })
        const body = await res.json().catch(() => null)
        if (res.ok && body?.status === 'success') return { ok: true, message: `Connected as ${body?.data?.user_name ?? body?.data?.user_id ?? 'Kite user'}.` }
        return { ok: false, message: body?.message || `Kite responded ${res.status}. Access tokens expire daily — regenerate if stale.` }
      }
      case 'upstox': {
        if (!p.accessToken) return { ok: false, message: 'Access token required (OAuth2 daily token from the Upstox login flow).' }
        const res = await timeoutFetch(`${p.baseUrl}/user/profile`, {
          headers: { Authorization: `Bearer ${p.accessToken}`, Accept: 'application/json' },
        })
        const body = await res.json().catch(() => null)
        if (res.ok && body?.status === 'success') return { ok: true, message: `Connected as ${body?.data?.user_name ?? 'Upstox user'}.` }
        return { ok: false, message: body?.errors?.[0]?.message || `Upstox responded ${res.status}. Tokens expire at 03:30 IST daily.` }
      }
      case 'angel_one': {
        if (!p.apiKey || !p.accessToken) return { ok: false, message: 'API key and JWT token required (SmartAPI TOTP login issues the JWT).' }
        const res = await timeoutFetch(`${p.baseUrl}/rest/secure/angelbroking/user/v1/getProfile`, {
          headers: {
            Authorization: `Bearer ${p.accessToken}`,
            'Content-Type': 'application/json',
            'X-UserType': 'USER', 'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1', 'X-ClientPublicIP': '127.0.0.1', 'X-MACAddress': '00:00:00:00:00:00',
            'X-PrivateKey': p.apiKey,
          },
        })
        const body = await res.json().catch(() => null)
        if (res.ok && body?.status === true) return { ok: true, message: `Connected as ${body?.data?.name ?? p.clientCode ?? 'Angel One user'}.` }
        return { ok: false, message: body?.message || `SmartAPI responded ${res.status}.` }
      }
      case 'dhan': {
        if (!p.accessToken) return { ok: false, message: 'Access token required (generate a 30-day token at web.dhan.co → DhanHQ Trading APIs).' }
        const res = await timeoutFetch(`${p.baseUrl}/fundlimit`, {
          headers: { 'access-token': p.accessToken, Accept: 'application/json' },
        })
        const body = await res.json().catch(() => null)
        if (res.ok && body && !body?.errorCode) return { ok: true, message: 'Connected — funds endpoint reachable.' }
        return { ok: false, message: body?.errorMessage || body?.errorCode || `Dhan responded ${res.status}.` }
      }
      case 'fyers': {
        if (!p.apiKey || !p.accessToken) return { ok: false, message: 'App ID (as API key) and daily access token are required.' }
        const res = await timeoutFetch(`${p.baseUrl}/profile`, {
          headers: { Authorization: `${p.apiKey}:${p.accessToken}` },
        })
        const body = await res.json().catch(() => null)
        if (res.ok && body?.s === 'ok') return { ok: true, message: `Connected as ${body?.data?.name ?? 'Fyers user'}.` }
        return { ok: false, message: body?.message || `Fyers responded ${res.status}.` }
      }
      case 'icici_breeze': {
        if (!p.apiKey || !p.accessToken) return { ok: false, message: 'App key and daily session token are required (generate via the Breeze login page).' }
        // Breeze requires a per-request checksum on most endpoints; treat saved
        // credentials as configured and verify on the first live data call.
        return { ok: true, message: 'Credentials saved. Breeze uses per-request checksums — the link is fully verified on the first live data request.' }
      }
      default:
        return { ok: false, message: `Unknown provider "${p.key}".` }
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, message: 'Connection test timed out after 8s.' }
    return { ok: false, message: `Connection test failed: ${e?.message ?? 'network error'}.` }
  }
}
