import { NextResponse } from 'next/server'
import { exchangeCode, refreshTokens, revokeToken } from '@/lib/oauth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// OAuth 2.0 token endpoint. Accepts JSON or application/x-www-form-urlencoded.
//   grant_type=authorization_code  code, client_id, client_secret, redirect_uri
//   grant_type=refresh_token       refresh_token, client_id, client_secret
// Client credentials may also come as HTTP Basic auth.
async function readBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return (await req.json().catch(() => ({}))) ?? {}
  const text = await req.text().catch(() => '')
  return Object.fromEntries(new URLSearchParams(text).entries())
}

export async function POST(req: Request) {
  const gate = await rateLimit(`oauth:token:${clientIp(req)}`, 60, 60)
  if (!gate.allowed) return NextResponse.json({ error: 'slow_down' }, { status: 429 })
  const b = await readBody(req)
  const basic = (req.headers.get('authorization') ?? '').replace(/^Basic\s+/i, '')
  let clientId = b.client_id ?? ''
  let clientSecret = b.client_secret ?? ''
  if (basic && !clientId) {
    const [id, secret] = Buffer.from(basic, 'base64').toString().split(':')
    clientId = id ?? ''; clientSecret = secret ?? ''
  }
  const headers = { 'Cache-Control': 'no-store', Pragma: 'no-cache' }
  if (b.grant_type === 'authorization_code') {
    const r = await exchangeCode(String(b.code ?? ''), clientId, clientSecret, String(b.redirect_uri ?? ''))
    return NextResponse.json(r, { status: 'error' in r ? 400 : 200, headers })
  }
  if (b.grant_type === 'refresh_token') {
    const r = await refreshTokens(String(b.refresh_token ?? ''), clientId, clientSecret)
    return NextResponse.json(r, { status: 'error' in r ? 400 : 200, headers })
  }
  return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400, headers })
}

// RFC 7009 revocation: POST { token }
export async function DELETE(req: Request) {
  const b = await readBody(req)
  await revokeToken(String(b.token ?? ''))
  return NextResponse.json({ ok: true })
}
