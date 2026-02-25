'use client';

import { useState } from 'react';
import styles from './page.module.css';

type StatusResult = {
  code: number;
  text: string;
  message?: string;
  body?: unknown;
};

const STATUS_LIST = [
  { code: 100, label: 'Continue' },
  { code: 200, label: 'OK' },
  { code: 201, label: 'Created' },
  { code: 300, label: 'Multiple Choice' },
  { code: 400, label: 'Bad Request' },
  { code: 401, label: 'Unauthorized' },
  { code: 402, label: 'Payment Required' },
  { code: 403, label: 'Forbidden' },
  { code: 404, label: 'Not Found' },
  { code: 500, label: 'Internal Server Error' },
];

export default function HttpStatusPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusResult | null>(null);

  const requestStatus = async (code: number) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/status/${code}`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);

      setResult({
        code: res.status,
        text: res.statusText || STATUS_LIST.find((s) => s.code === res.status)?.label || 'Unknown',
        message: (body as { message?: string })?.message,
        body,
      });
    } catch (err) {
      console.error(err);
      setError('요청 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1 className={styles.title}>HTTP 상태 테스트</h1>
        <p className={styles.subtitle}>
          아래 상태 코드를 선택하면 API가 해당 코드로 응답하고, 결과가 페이지에 표시됩니다. 모든 요청은 try/catch로
          안전하게 처리됩니다.
        </p>

        <div className={styles.buttonGrid}>
          {STATUS_LIST.map((status) => (
            <button
              key={status.code}
              type="button"
              className={styles.button}
              disabled={loading}
              onClick={() => requestStatus(status.code)}
            >
              {status.code} {status.label}
            </button>
          ))}
        </div>

        {loading && <p className={styles.info}>요청 중입니다…</p>}
        {error && (
          <p className={styles.infoError}>
            {error}
          </p>
        )}

        {result && (
          <div className={styles.resultCard}>
            <h2 className={styles.resultTitle}>
              응답 코드: {result.code} {result.text}
            </h2>
            <p className={styles.info}>메시지: {result.message || '본문이 없습니다.'}</p>
            <pre className={styles.pre}>{JSON.stringify(result.body, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  );
}
