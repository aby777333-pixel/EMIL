import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user?.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
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
