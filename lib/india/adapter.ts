// Connection testers for India market API providers.
// Each test performs a lightweight authenticated read (profile/funds) against
// the provider's REST API. No orders are ever placed from here.

import { createHmac } from 'node:crypto'

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
      case 'dalalai': {
        if (!p.apiKey) return { ok: false, message: 'API key required — generate one from the DalalAI dashboard (per-key scoping applies).' }
        const res = await timeoutFetch(`${p.baseUrl}/market-regime`, {
          headers: { 'X-API-Key': p.apiKey, Accept: 'application/json' },
        })
        if (res.status === 429) return { ok: false, message: 'DalalAI responded 429 — plan rate limit or monthly call cap reached.' }
        if (res.status === 401 || res.status === 403) return { ok: false, message: `DalalAI rejected the key (${res.status}). Check the key and that its scope includes /market-regime.` }
        const body = await res.json().catch(() => null)
        if (res.ok && body) return { ok: true, message: 'Connected — market-regime endpoint returned live DalalAI signal data.' }
        return { ok: false, message: `DalalAI responded ${res.status}.` }
      }
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
      case 'deribit':
      case 'deribit_testnet': {
        const env = p.key === 'deribit_testnet' ? 'Testnet' : 'Live'
        if (!p.apiKey || !p.apiSecret) return { ok: false, message: `Client ID (API key) and client secret are required — create them under Account → API on ${env === 'Testnet' ? 'test.deribit.com' : 'deribit.com'}.` }
        const auth = await timeoutFetch(
          `${p.baseUrl}/public/auth?grant_type=client_credentials&client_id=${encodeURIComponent(p.apiKey)}&client_secret=${encodeURIComponent(p.apiSecret)}`,
          { headers: { Accept: 'application/json' } },
        )
        const authBody = await auth.json().catch(() => null)
        const token = authBody?.result?.access_token
        if (!token) {
          const err = authBody?.error
          if (err?.code === 13004 || /invalid_credentials/i.test(err?.message ?? '')) return { ok: false, message: `Deribit ${env} rejected the client ID / secret. Testnet keys only work on the Testnet row and live keys only on the Live row.` }
          return { ok: false, message: err?.message ? `Deribit ${env}: ${err.message} (code ${err.code}).` : `Deribit ${env} responded ${auth.status}.` }
        }
        const sum = await timeoutFetch(`${p.baseUrl}/private/get_account_summaries`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
        const sumBody = await sum.json().catch(() => null)
        const summaries = sumBody?.result?.summaries
        if (Array.isArray(summaries) && summaries.length) {
          const equity = summaries.map((s: any) => `${s.currency} ${Number(s.equity ?? 0).toFixed(4)}`).join(', ')
          return { ok: true, message: `Connected to Deribit ${env} — equity: ${equity}.` }
        }
        return { ok: true, message: `Connected to Deribit ${env} — OAuth token issued (scope: ${authBody.result.scope ?? 'n/a'}).` }
      }
      case 'delta_exchange':
      case 'delta_exchange_testnet': {
        const env = p.key === 'delta_exchange_testnet' ? 'Demo/Testnet' : 'Live'
        if (!p.apiKey || !p.apiSecret) return { ok: false, message: `API key and secret are required — create them under Profile → API Keys on ${env === 'Live' ? 'india.delta.exchange' : 'demo.delta.exchange'} and whitelist EMIL's server IP.` }
        const path = '/v2/wallet/balances'
        const ts = Math.floor(Date.now() / 1000).toString()
        const signature = createHmac('sha256', p.apiSecret).update(`GET${ts}${path}`).digest('hex')
        const res = await timeoutFetch(`${p.baseUrl}${path}`, {
          headers: { 'api-key': p.apiKey, timestamp: ts, signature, 'User-Agent': 'emil-cockpit/1.0', Accept: 'application/json' },
        })
        const body = await res.json().catch(() => null)
        if (res.ok && body?.success) {
          const rows: any[] = Array.isArray(body.result) ? body.result : []
          const wallet = rows.slice(0, 4).map((r) => `${r.asset_symbol ?? r.asset?.symbol ?? '?'} ${r.balance ?? r.available_balance ?? '0'}`).join(', ')
          return { ok: true, message: `Connected to Delta Exchange ${env} — wallet: ${wallet || 'empty'}.` }
        }
        const code: string | undefined = body?.error?.code
        if (code === 'ip_not_whitelisted_for_api_key') {
          const ip = body?.error?.context?.client_ip
          return { ok: false, message: `Delta ${env} recognised the key but this server's IP${ip ? ` (${ip})` : ''} is not on the key's allow-list. Edit the API key on Delta and add that IP, then test again.` }
        }
        if (code === 'invalid_api_key') return { ok: false, message: `Delta ${env} says the API key is invalid for this environment. Demo keys only work on the Demo/Testnet row and live keys only on the Live row.` }
        if (code === 'expired_signature' || code === 'signature_mismatch' || code === 'invalid_signature') return { ok: false, message: `Delta ${env} rejected the request signature (${code}) — re-check the API secret.` }
        return { ok: false, message: code ? `Delta Exchange ${env} error: ${code}.` : `Delta ${env} responded ${res.status}.` }
      }
      case 'gemini':
      case 'gemini_sandbox': {
        const env = p.key === 'gemini_sandbox' ? 'Sandbox' : 'Live'
        if (!p.apiKey || !p.apiSecret) return { ok: false, message: `API key and secret are required — create them under Settings → API on ${env === 'Sandbox' ? 'exchange.sandbox.gemini.com' : 'exchange.gemini.com'}.` }
        const payload = Buffer.from(JSON.stringify({ request: '/v1/balances', nonce: Date.now() })).toString('base64')
        const signature = createHmac('sha384', p.apiSecret).update(payload).digest('hex')
        const res = await timeoutFetch(`${p.baseUrl}/v1/balances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': '0',
            'X-GEMINI-APIKEY': p.apiKey,
            'X-GEMINI-PAYLOAD': payload,
            'X-GEMINI-SIGNATURE': signature,
            'Cache-Control': 'no-cache',
          },
        })
        const body = await res.json().catch(() => null)
        if (res.ok && Array.isArray(body)) {
          const bal = body.filter((b: any) => Number(b?.amount) > 0).slice(0, 4).map((b: any) => `${b.currency} ${b.amount}`).join(', ')
          return { ok: true, message: `Connected to Gemini ${env} — balances: ${bal || 'empty'}.` }
        }
        const reason: string | undefined = body?.reason
        if (reason === 'InvalidApiKey') return { ok: false, message: `Gemini ${env} says the API key is invalid for this environment. Sandbox keys only work on the Sandbox row and live keys only on the Live row.` }
        if (reason === 'InvalidSignature') return { ok: false, message: `Gemini ${env} rejected the signature — re-check the API secret.` }
        if (reason === 'InvalidNonce') return { ok: false, message: `Gemini ${env} rejected the nonce — the key was used with a higher nonce elsewhere; create a dedicated key for EMIL.` }
        return { ok: false, message: body?.message ? `Gemini ${env}: ${body.message}` : `Gemini ${env} responded ${res.status}.` }
      }
      default: {
        // Brokers without a bespoke tester (TOTP/OTP or checksum login flows
        // that cannot be exercised server-side without a live session).
        if (!p.apiKey && !p.accessToken) return { ok: false, message: 'Add the API credentials first — see the Docs link for where to generate them.' }
        return { ok: true, message: 'Credentials saved. This broker uses an interactive login flow — the link is fully verified on the first live request.' }
      }
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, message: 'Connection test timed out after 8s.' }
    return { ok: false, message: `Connection test failed: ${e?.message ?? 'network error'}.` }
  }
}
