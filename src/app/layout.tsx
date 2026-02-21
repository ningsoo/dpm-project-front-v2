import type { Metadata } from 'next';
import Providers from './providers/Providers';
import Header from '@/components/common/Header/Header';
import Footer from '@/components/common/Footer/Footer';
import ToastRoot from '@/components/common/Toast/Toast';
import TopButton from '@/components/common/TopButton/TopButton';
import ThemeSync from './ThemeSync';
import ScrollToTop from '@/components/common/ScrollToTop/ScrollToTop';
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

/* 새로고침 시 헤더 아이콘 즉시 표시: SSR 전에 data-auth 설정 → hydration 불일치 방지 */
const authScript = `
(function() {
  try {
    var token = localStorage.getItem('accessToken');
    document.documentElement.setAttribute('data-auth', token ? 'true' : 'false');
  } catch (e) {
    document.documentElement.setAttribute('data-auth', 'false');
  }
})();
`;

/* 새로고침 시 스크롤 복원 후 상단 점프로 인한 '접힘' 현상 방지 */
const scrollInitScript = `
(function() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scrollInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: authScript }} />
      </head>
      <body>
        <Providers>
          <ThemeSync />
          <ScrollToTop />
          <Header />
          <main style={{ paddingTop: 64, minHeight: 'calc(100vh - 64px - 120px)', position: 'relative' }}>
            {children}
            <TopButton />
          </main>
          <Footer />
          <ToastRoot />
        </Providers>
      </body>
    </html>
  );
}
