import { Suspense } from 'react';
import SuccessClient from './SuccessClient';
import CreditLoadingFallback from '../CreditLoadingFallback';

export default function Page() {
  return (
    <Suspense fallback={<CreditLoadingFallback />}>
      <SuccessClient />
    </Suspense>
  );
}
