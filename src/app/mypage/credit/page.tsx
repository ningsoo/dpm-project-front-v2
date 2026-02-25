import { Suspense } from 'react';
import CreditClient from './CreditClient';
import CreditLoadingFallback from './CreditLoadingFallback';

export default function Page() {
  return (
    <Suspense fallback={<CreditLoadingFallback />}>
      <CreditClient />
    </Suspense>
  );
}
