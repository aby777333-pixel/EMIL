// One-off migration: encrypt every plaintext credential already stored in
// india_api_providers, user_broker_connections and data_providers.
//
//   EMIL_SECRETS_KEY must be set (same value the app runs with), then:
//   npx tsx --require dotenv/config scripts/encrypt-secrets.ts
//
// Idempotent — values already prefixed "enc:v1:" are skipped, so re-running is
// safe. Never prints a secret.

import { PrismaClient } from '@prisma/client'
import { SECRET_FIELDS, encryptSecret, encryptionActive, isEncrypted } from '../lib/secrets'

const prisma = new PrismaClient()

async function main() {
  if (!encryptionActive()) {
    console.error('EMIL_SECRETS_KEY is not set — refusing to run (nothing would be encrypted).')
    process.exit(1)
  }
  let changed = 0

  const providers = await prisma.indiaApiProvider.findMany()
  for (const p of providers) {
    const data: Record<string, string> = {}
    for (const f of SECRET_FIELDS) {
      const v = (p as any)[f]
      if (typeof v === 'string' && v && !isEncrypted(v)) data[f] = encryptSecret(v) as string
    }
    if (Object.keys(data).length) { await prisma.indiaApiProvider.update({ where: { id: p.id }, data }); changed++ }
  }

  const links = await prisma.userBrokerConnection.findMany()
  for (const l of links) {
    const data: Record<string, string> = {}
    for (const f of SECRET_FIELDS) {
      const v = (l as any)[f]
      if (typeof v === 'string' && v && !isEncrypted(v)) data[f] = encryptSecret(v) as string
    }
    if (Object.keys(data).length) { await prisma.userBrokerConnection.update({ where: { id: l.id }, data }); changed++ }
  }

  const dataProviders = await prisma.dataProvider.findMany({ where: { apiKey: { not: null } } })
  for (const d of dataProviders) {
    if (d.apiKey && !isEncrypted(d.apiKey)) {
      await prisma.dataProvider.update({ where: { id: d.id }, data: { apiKey: encryptSecret(d.apiKey) as string } })
      changed++
    }
  }

  console.log(`Encrypted credentials on ${changed} row(s). Rows already encrypted were left untouched.`)
}

main()
  .catch((e) => { console.error(e?.message ?? e); process.exit(1) })
  .finally(() => prisma.$disconnect())
