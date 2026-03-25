import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// ABC Normal — all 7 weights registered under a single font family.
// next/font/local preloads all declared weights (~122KB, under 200KB budget).
// Per-weight selective preloading is not supported by next/font/local — splitting
// into separate declarations would create distinct font families, and CSS font
// matching does not fall through to the next family based on weight.
const abcNormal = localFont({
  src: [
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    { path: '../../../packages/ui/src/fonts/ABCNormal-Book.woff2', weight: '400', style: 'normal' },
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Neutral.woff2',
      weight: '450',
      style: 'normal',
    },
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    { path: '../../../packages/ui/src/fonts/ABCNormal-Bold.woff2', weight: '700', style: 'normal' },
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Black.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Super.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-abc-normal',
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Edin — Curated Contributor Platform',
  description:
    'A curated contributor platform for the ROSE decentralized financial infrastructure ecosystem where every contribution is evaluated, recognized, and rewarded.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${abcNormal.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
