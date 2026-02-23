import type { PageResponse } from './types';

export function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  return d.slice(0, 10);
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
