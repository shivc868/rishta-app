import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers';
import { THEME_BOOTSTRAP } from '@/lib/theme';

// One modern, open sans for everything: wide letterforms and a tall x-height
// read well on cheap screens, and the heavier weights carry titles on their own.
const sans = Plus_Jakarta_Sans({
  variable: '--font-sans-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
// Hindi lines were falling back to whatever Devanagari font the phone had,
// which is why the English and Hindi looked like two different apps.
const notoDevanagari = Noto_Sans_Devanagari({
  variable: '--font-noto-devanagari',
  subsets: ['devanagari'],
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'Rishta Register',
  description:
    'A trust-first matrimonial register for our community. Photos and phone numbers stay private until both families agree.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Let the page run under the iPhone notch and home bar; the bars pad
  // themselves with env(safe-area-inset-*) so nothing is hidden.
  viewportFit: 'cover',
  // Parents zoom. Never lock it.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#db2777' },
    { media: '(prefers-color-scheme: dark)', color: '#1a0f14' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      // Light by default on every device; the bootstrap script below switches
      // to dark only when the family chose it in Settings.
      data-theme="light"
      suppressHydrationWarning
      className={`${sans.variable} ${geistMono.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
