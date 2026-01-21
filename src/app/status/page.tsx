'use client';

import { useState, type CSSProperties } from 'react';

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
    <main style={styles.container}>
      <section style={styles.card}>
        <h1 style={styles.title}>HTTP 상태 테스트</h1>
        <p style={styles.subtitle}>
          아래 상태 코드를 선택하면 API가 해당 코드로 응답하고, 결과가 페이지에 표시됩니다. 모든 요청은 try/catch로
          안전하게 처리됩니다.
        </p>

        <div style={styles.buttonGrid}>
          {STATUS_LIST.map((status) => (
            <button
              key={status.code}
              type="button"
              style={styles.button}
              disabled={loading}
              onClick={() => requestStatus(status.code)}
            >
              {status.code} {status.label}
            </button>
          ))}
        </div>

        {loading && <p style={styles.info}>요청 중입니다…</p>}
        {error && (
          <p style={{ ...styles.info, color: '#d32f2f' }}>
            {error}
          </p>
        )}

        {result && (
          <div style={styles.resultCard}>
            <h2 style={styles.resultTitle}>
              응답 코드: {result.code} {result.text}
            </h2>
            <p style={styles.info}>메시지: {result.message || '본문이 없습니다.'}</p>
            <pre style={styles.pre}>{JSON.stringify(result.body, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '48px 16px',
  },
  card: {
    maxWidth: 960,
    width: '100%',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 28,
  },
  subtitle: {
    margin: '0 0 24px',
    color: '#4b5563',
    lineHeight: 1.5,
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  info: {
    margin: '8px 0',
    color: '#1f2937',
  },
  resultCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
  },
  resultTitle: {
    margin: '0 0 8px',
  },
  pre: {
    margin: 0,
    padding: 12,
    background: '#111827',
    color: '#e5e7eb',
    borderRadius: 8,
    overflowX: 'auto',
    fontSize: 13,
  },
};
