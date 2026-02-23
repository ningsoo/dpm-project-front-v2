'use client';

import { Adm1nLayout } from '@/components/adm1n/layout/Adm1nLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Adm1nLayout>{children}</Adm1nLayout>;
}
