export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/((?!api|login|w/|status|sdk/|_next/static|_next/image|favicon|og-image|robots|sitemap).*)',
  ],
}
