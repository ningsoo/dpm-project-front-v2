import { Suspense } from 'react';
import CreditClient from './CreditClient';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>로딩 중...</div>}>
      <CreditClient />
    </Suspense>
  );
}
