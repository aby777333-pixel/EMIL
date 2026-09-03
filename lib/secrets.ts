// Encryption at rest for provider / broker credentials (spec §11).
//
// AES-256-GCM envelope with a single server-side key from EMIL_SECRETS_KEY
// (32 random bytes, base64). Ciphertext is stored as "enc:v1:<base64 iv|tag|ct>"
// so a row can be told apart from legacy plaintext at a glance, and reads are
// transparent: decryptSecret() returns plaintext rows unchanged, which lets the
// code deploy BEFORE the one-off scripts/encrypt-secrets.ts migration runs.
//
// If the key is missing, writes stay plaintext (with a console warning once)
// rather than failing — losing the ability to save a broker key is worse than
// the status quo. Reads of an encrypted value without the key DO fail loudly.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const PREFIX = 'enc:v1:'
const IV_LEN = 12
const TAG_LEN = 16

let warned = false

function keyBytes(): Buffer | null {
  const raw = process.env.EMIL_SECRETS_KEY?.trim()
  if (!raw) return null
  try {
    const b = Buffer.from(raw, 'base64')
    if (b.length === 32) return b
  } catch { /* fall through */ }
  // Any other string: derive a 32-byte key deterministically.
  return createHash('sha256').update(raw).digest()
}

export function encryptionActive(): boolean {
  return keyBytes() !== null
}

export function isEncrypted(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export function encryptSecret(value?: string | null): string | null {
  if (value === undefined || value === null || value === '') return value ?? null
  if (isEncrypted(value)) return value
  const key = keyBytes()
  if (!key) {
    if (!warned) { warned = true; console.warn('[secrets] EMIL_SECRETS_KEY is not set — credentials are being stored in plaintext.') }
    return value
  }
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptSecret(value?: string | null): string | null {
  if (value === undefined || value === null || value === '') return value ?? null
  if (!isEncrypted(value)) return value
  const key = keyBytes()
  if (!key) throw new Error('EMIL_SECRETS_KEY is not set — cannot decrypt stored credentials.')
  const buf = Buffer.from(value.slice(PREFIX.length), 'base64')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

// The credential columns shared by india_api_providers and
// user_broker_connections. clientCode doubles as the OKX/KuCoin passphrase, so
// it is treated as a secret too.
export const SECRET_FIELDS = ['apiKey', 'apiSecret', 'accessToken', 'clientCode'] as const
export type SecretField = (typeof SECRET_FIELDS)[number]

// Encrypt whichever secret fields are present on a Prisma data object.
export function encryptFields<T extends Record<string, any>>(data: T): T {
  const out: Record<string, any> = { ...data }
  for (const f of SECRET_FIELDS) {
    if (typeof out[f] === 'string') out[f] = encryptSecret(out[f])
  }
  return out as T
}

// Return a copy of a DB row with its secret fields decrypted.
export function decryptRow<T extends Record<string, any> | null | undefined>(row: T): T {
  if (!row) return row
  const out: Record<string, any> = { ...row }
  for (const f of SECRET_FIELDS) {
    if (typeof out[f] === 'string') out[f] = decryptSecret(out[f])
  }
  return out as T
}
