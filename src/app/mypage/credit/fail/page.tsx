import { Suspense } from 'react';
import FailClient from './FailClient';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>로딩 중...</div>}>
      <FailClient />
    </Suspense>
  );
}
