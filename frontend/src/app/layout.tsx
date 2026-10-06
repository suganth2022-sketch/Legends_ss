import type { Metadata } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'Legends MLM',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${playfair.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
