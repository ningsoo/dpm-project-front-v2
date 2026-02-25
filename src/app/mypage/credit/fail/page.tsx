import { Suspense } from 'react';
import FailClient from './FailClient';
import CreditLoadingFallback from '../CreditLoadingFallback';

export default function Page() {
  return (
    <Suspense fallback={<CreditLoadingFallback />}>
      <FailClient />
    </Suspense>
  );
}
