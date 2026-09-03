import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { NexusGlobal } from '@/components/nexus/NexusGlobal';
import { ServiceWorker } from '@/components/ServiceWorker';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'EMIL Trade | Native Trading Platform',
  description: 'Next-generation brokerage operating system. Institutional-grade execution, multi-asset trading, CRM, compliance, white-label infrastructure, and AI analytics — the native trading platform of EMIL.',
  keywords: ['trading platform', 'forex broker', 'white label', 'prop trading', 'copy trading', 'PAMM', 'EMIL', 'EMIL Trade'],
  openGraph: {
    title: 'EMIL Trade — Native Trading Platform',
    description: 'The operating system for modern brokerages. 500+ instruments, sub-millisecond execution, 18 integrated modules.',
    type: 'website',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EMIL Trade',
  },
  icons: {
    icon: '/emil-trade-mark.svg',
    apple: '/emil-trade-mark.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#060D16',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          {children}
          <NexusGlobal />
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
