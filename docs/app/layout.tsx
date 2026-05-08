import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import localFont from 'next/font/local';

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

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="th" className={`${lineSeedSans.variable} ${lineSeedSans.className}`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
