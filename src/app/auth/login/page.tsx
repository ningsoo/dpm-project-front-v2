import { Suspense } from 'react';
import LoginClient from './LoginClient';
import AuthLoadingFallback from '../AuthLoadingFallback';

export default function Page() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <LoginClient />
    </Suspense>
  );
}
