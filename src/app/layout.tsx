import type { Metadata } from 'next';
import Providers from './providers/Providers';
import Header from '@/components/common/Header/Header';
import Footer from '@/components/common/Footer/Footer';
import ToastRoot from '@/components/common/Toast/Toast';
import ThemeSync from './ThemeSync';
import { MockAuthWrapper } from '@/auth/MockAuthWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'SOUNDOCK',
  description: 'Share your creative works and music playlists',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* 목로그인 전용 - 추후 이 라인과 import만 삭제 */}
        <MockAuthWrapper>
          <Providers>
            <ThemeSync />
            <Header />
            <main style={{ paddingTop: 64, minHeight: 'calc(100vh - 64px - 120px)' }}>{children}</main>
            <Footer />
            <ToastRoot />
          </Providers>
        </MockAuthWrapper>
      </body>
    </html>
  );
}
