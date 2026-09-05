# EMIL security notes

## Secrets and where they live
- Server-side only, in Netlify environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `EMIL_SECRETS_KEY` (AES-256-GCM envelope key for every stored credential), AI/vendor keys, gateway keys, `CRON_SECRET`, SSO client secrets.
- Stored encrypted with `EMIL_SECRETS_KEY`: broker credentials (`user_broker_connections`, house rows in `india_api_providers`), webhook signing secrets, chat-channel webhook URLs, customers' own vendor keys.
- Stored hashed (SHA-256) and shown once: API keys, bridge tokens, invite tokens, client-portal tokens, OAuth client secrets, OAuth codes / access / refresh tokens, news-link signatures (HMAC).

## Rotation runbook
1. `EMIL_SECRETS_KEY`: add the new key, re-encrypt rows (script: decrypt with old, encrypt with new — write it against `lib/secrets.ts`), then remove the old key. Until re-encryption completes keep both keys available.
2. `NEXTAUTH_SECRET`: rotate → every session is signed out; news `go` links issued before rotation stop validating (they fall back to the unavailable page's "open original").
3. Customer API keys: customers rotate from `/developers` (old key valid 24 h). Admins revoke from Command → Customers.
4. Bridge / webhook / embed / OAuth secrets: rotate from `/bridge`, `/developers`, `/integrations`.
5. Gateway webhook secrets: rotate in the gateway dashboard and Netlify together.

## Controls in place
Rate limits on login, signup, API keys (per plan), OAuth token endpoint, bridge and portal endpoints; TOTP 2FA; suspension enforced at login and API; org kill switch / restricted list / limits / maker-checker on paper orders; the public API never places live orders; tamper-evident compliance archive; audit log on every privileged action; GDPR/DPDP export and delete at `/api/account`.

## Not yet done
External penetration test; SAML; secrets re-encryption script (write before the first `EMIL_SECRETS_KEY` rotation); automated dependency audit in CI.
