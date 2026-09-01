import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { Toaster as HotToaster } from 'react-hot-toast'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { Providers } from './providers'

export const dynamic = 'force-dynamic'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: 'EMIL Control Cockpit',
  description: 'Evolutionary Market Intelligence Layer — autonomous multi-agent trading intelligence command center.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  openGraph: {
    title: 'EMIL Control Cockpit',
    description: 'Autonomous Multi-Agent Trading Intelligence',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
          <Providers>{children}</Providers>
          <Toaster />
          {/* Most feature pages notify via react-hot-toast — its Toaster was
              never mounted, silently swallowing every success/error message. */}
          <HotToaster
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: { background: '#101826', color: '#e2e8f0', border: '1px solid #1e293b', fontSize: '13px', maxWidth: '420px' },
              success: { iconTheme: { primary: '#34d399', secondary: '#0b1220' } },
              error: { duration: 8000, iconTheme: { primary: '#f87171', secondary: '#0b1220' } },
            }}
          />
          {/* IMPORTANT: Do not remove — handles chunk loading race conditions in the dev server */}
          <ChunkLoadErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
