import type { Metadata, Viewport } from 'next';
import { Inter, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import { RegisterServiceWorker } from '@/components/pwa/register-sw';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '400', '600', '700'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pulse — Votre sport, votre rythme',
  description: 'Planifiez vos séances, suivez vos progrès, trouvez votre coach.',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pulse',
  },
  openGraph: {
    title: 'Pulse — Votre sport, votre rythme',
    description: 'Planifiez vos séances, suivez vos progrès, trouvez votre coach.',
    siteName: 'Pulse',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#22c55e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorant.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased text-text bg-bg">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
