import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
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
  icons: { icon: '/icon.svg' },
  openGraph: {
    title: 'Pulse — Votre sport, votre rythme',
    description: 'Planifiez vos séances, suivez vos progrès, trouvez votre coach.',
    siteName: 'Pulse',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorant.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased text-text bg-bg">{children}</body>
    </html>
  );
}
