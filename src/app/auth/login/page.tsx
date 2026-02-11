import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function Page() {
  return (
    <Suspense fallback={<p style={{ padding: 24, textAlign: 'center' }}>로딩 중...</p>}>
      <LoginClient />
    </Suspense>
  );
}
