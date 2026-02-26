import type { PageResponse } from './types';

export function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  const s = String(d).trim();
  if (!s) return '-';
  // 백엔드가 LocalDateTime을 배열로 보낸 경우 "2025,2,26,..." 형태
  if (s.includes(',')) {
    const parts = s.split(',').map((x) => parseInt(x.trim(), 10));
    const y = parts[0];
    const m = parts[1];
    const day = parts[2];
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(day)) {
      return `${y}.${String(m).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
    }
  }
  // ISO 등 "2025-02-26" 형태면 점으로 변환
  if (s.length >= 10 && s[4] === '-' && s[7] === '-') {
    return s.slice(0, 10).replace(/-/g, '.');
  }
  return s.slice(0, 10);
}

export function formatDateAndTime(d: string | null | undefined): { date: string; time: string } {
  const s = d ? String(d).trim() : '';
  if (!s) return { date: '-', time: '-' };
  const sp = s.split(/\s+/);
  const date = sp[0] || '-';
  const time = sp[1] || '-';
  return { date, time };
}

export function safeParse(data: unknown): PageResponse {
  const d = data as Record<string, unknown> | undefined;
  return {
    content: Array.isArray(d?.content) ? (d.content as unknown[]) : [],
    totalPages: typeof d?.totalPages === 'number' ? d.totalPages : 0,
    totalElements: typeof d?.totalElements === 'number' ? d.totalElements : 0,
    number: typeof d?.number === 'number' ? d.number : 0,
  };
}

export function get(obj: unknown, key: string): unknown {
  if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
  return undefined;
}

export function str(v: unknown): string {
  if (v === null || v === undefined) return '-';
  return String(v);
}

export function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
