import { Suspense } from 'react';
import SuccessClient from './SuccessClient';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>로딩 중...</div>}>
      <SuccessClient />
    </Suspense>
  );
}
