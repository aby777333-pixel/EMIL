import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { rateLimit, rateLimitReset } from '@/lib/rate-limit'
import { decryptSecret } from '@/lib/secrets'
import { verifyTotp } from '@/lib/totp'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
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
        return { id: user.id, email: user.email, name: user.name ?? '', role: user.role } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
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
