import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { rateLimit, rateLimitReset } from '@/lib/rate-limit'
import { decryptSecret } from '@/lib/secrets'
import { verifyTotp } from '@/lib/totp'
import { autoJoinByDomain } from '@/lib/org'

// Sessions are JWTs; users live in our own `users` table. OAuth providers
// (enterprise sign-in, round C) are env-gated and map onto the same table by
// e-mail — no adapter tables are needed, so the Prisma adapter is gone.
export const googleSsoConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
export const microsoftSsoConfigured = () => !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET)

async function ensureOAuthUser(email: string, name?: string | null) {
  const lower = email.toLowerCase().trim()
  let user = await prisma.user.findUnique({ where: { email: lower }, include: { profile: true } })
  if (!user) {
    // Random unusable password: SSO users sign in through their identity provider.
    const hashed = await bcrypt.hash(randomBytes(32).toString('hex'), 10)
    const created = await prisma.user.create({ data: { email: lower, password: hashed, name: name ?? '' } })
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    await prisma.customerProfile.create({ data: { userId: created.id, status: 'trial', planKey: 'trial', trialEndsAt } }).catch(() => {})
    await prisma.auditLog.create({ data: { userId: created.id, actor: 'system', action: 'CUSTOMER SIGNUP (SSO)', category: 'crm', detail: `New customer ${lower} signed in through enterprise SSO — 14-day trial started.` } }).catch(() => {})
    user = await prisma.user.findUnique({ where: { email: lower }, include: { profile: true } })
  }
  if (!user) return null
  if (user.role !== 'admin' && (user.profile?.status === 'suspended' || user.profile?.status === 'churned')) return null
  autoJoinByDomain(user.id, lower).catch(() => {})
  prisma.customerProfile.update({ where: { userId: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {})
  return user
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: 'Authenticator code', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.toLowerCase().trim()
        // Brute-force protection: failures per email and per client IP, 15-minute windows.
        const ip = String((req as any)?.headers?.['x-nf-client-connection-ip'] ?? (req as any)?.headers?.['x-forwarded-for'] ?? 'unknown').split(',')[0].trim()
        const [byEmail, byIp] = await Promise.all([rateLimit(`login:email:${email}`, 10, 900), rateLimit(`login:ip:${ip}`, 30, 900)])
        if (!byEmail.allowed || !byIp.allowed) {
          throw new Error(`Too many sign-in attempts. Try again in ${Math.ceil(Math.max(byEmail.retryAfterSec, byIp.retryAfterSec) / 60)} minutes.`)
        }
        const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } })
        if (!user?.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        // Two-factor authentication (TOTP) when the account has it enabled.
        if (user.totpEnabled && user.totpSecret) {
          const code = String((credentials as any)?.totp ?? '').trim()
          if (!code) throw new Error('TOTP_REQUIRED')
          if (!verifyTotp(decryptSecret(user.totpSecret) as string, code)) throw new Error('TOTP_INVALID')
        }
        await rateLimitReset(`login:email:${email}`)
        // Suspended/churned customers cannot sign in (Command Center CRM control).
        if (user.role !== 'admin' && (user.profile?.status === 'suspended' || user.profile?.status === 'churned')) {
          throw new Error('Your EMIL account is suspended. Contact support to restore access.')
        }
        prisma.customerProfile.update({ where: { userId: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {})
        autoJoinByDomain(user.id, email).catch(() => {})
        return { id: user.id, email: user.email, name: user.name ?? '', role: user.role } as any
      },
    }),
    ...(googleSsoConfigured() ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID as string, clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, allowDangerousEmailAccountLinking: true })] : []),
    ...(microsoftSsoConfigured() ? [AzureADProvider({ clientId: process.env.AZURE_AD_CLIENT_ID as string, clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string, tenantId: process.env.AZURE_AD_TENANT_ID ?? 'common', allowDangerousEmailAccountLinking: true })] : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider === 'credentials') return true
      const email = (user?.email ?? (profile as any)?.email ?? '') as string
      if (!email) return false
      // Google reports verified e-mails; refuse unverified ones.
      if (account.provider === 'google' && (profile as any)?.email_verified === false) return false
      const ours = await ensureOAuthUser(email, user?.name)
      return !!ours
    },
    async jwt({ token, user, account }) {
      if (account && account.provider !== 'credentials' && token.email) {
        // Map the identity-provider subject onto OUR user id.
        const ours = await prisma.user.findUnique({ where: { email: String(token.email).toLowerCase() } })
        if (ours) { token.sub = ours.id; (token as any).role = ours.role }
        return token
      }
      if (user?.id) token.sub = user.id
      if ((user as any)?.role) (token as any).role = (user as any).role
      return token
    },
    async session({ session, token }) {
      if (session?.user && token?.sub) (session.user as any).id = token.sub
      if (session?.user && (token as any)?.role) (session.user as any).role = (token as any).role
      return session
    },
  },
}

// Server-side admin check for privileged routes. The role in the JWT is a UI
// hint only — privileged actions must re-verify against the database.
export async function requireAdmin(userId: string | undefined | null) {
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return user?.role === 'admin' ? user : null
}
