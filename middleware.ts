export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/((?!api|login|w/|_next/static|_next/image|favicon|og-image|robots|sitemap).*)',
  ],
}
