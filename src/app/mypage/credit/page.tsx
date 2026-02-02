'use client';

import { useSearchParams } from 'next/navigation';

export default function CreditPage() {
  const params = useSearchParams();
  const amount = params.get('amount') ?? '0';

  return (
    <main style={{ padding: 24 }}>
      <h1>재화 충전</h1>
      <div style={{ marginTop: 12 }}>amount: {amount}</div>
    </main>
  );
}
