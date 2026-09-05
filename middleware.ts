export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/((?!api|login|w/|c/|embed/|status|sdk/|bridge/EMIL|_next/static|_next/image|favicon|og-image|robots|sitemap).*)',
  ],
}
