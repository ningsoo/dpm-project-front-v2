import type { Metadata } from 'next';
import Providers from './providers/Providers';
import Header from '@/components/common/Header/Header';
import Footer from '@/components/common/Footer/Footer';
import ToastRoot from '@/components/common/Toast/Toast';
import TopButton from '@/components/common/TopButton/TopButton';
import ThemeSync from './ThemeSync';
import './globals.css';

export const metadata: Metadata = {
  title: 'SOUNDOCK',
  description: 'Share your creative works and music playlists',
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('darkMode');
    if (stored === 'true') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <ThemeSync />
          <Header />
          <main style={{ paddingTop: 64, minHeight: 'calc(100vh - 64px - 120px)' }}>{children}</main>
          <Footer />
          <ToastRoot />
          <TopButton />
        </Providers>
      </body>
    </html>
  );
}
