'use client';

import { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';

export function MockAuthWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
