import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import localFont from 'next/font/local';
import type { Metadata } from 'next';

const lineSeedSans = localFont({
  variable: '--font-line-seed-sans',
  display: 'swap',
  src: [
    {
      path: '../public/fonts/LINESeedSansTH_W_Th.woff',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/LINESeedSansTH_W_Rg.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/LINESeedSansTH_W_Bd.woff',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/LINESeedSansTH_W_XBd.woff',
      weight: '800',
      style: 'normal',
    },
  ],
});

export const metadata: Metadata = {
  title: 'WebX 5M',
  description: 'Documentation for the WebX 5M vanilla module framework.',
  icons: {
    icon: '/webx-mark.svg',
    shortcut: '/webx-mark.svg',
    apple: '/webx-mark.svg',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="th" className={`${lineSeedSans.variable} ${lineSeedSans.className}`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
