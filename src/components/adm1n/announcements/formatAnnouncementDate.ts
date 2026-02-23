/**
 * 공지사항 UI 전용 날짜 포맷.
 * 입력: [2026, 2, 23, 9, 49, 13] 또는 "2026,2,23,9,49,13" 형태
 * 출력: "2026.02.23" (YYYY.MM.DD), 시간 미표시. 없으면 ''.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fromParts(year: number, month: number, day: number): string {
  const y = Number.isFinite(year) ? year : 0;
  const m = Number.isFinite(month) ? Math.max(1, Math.min(12, month)) : 1;
  const d = Number.isFinite(day) ? Math.max(1, Math.min(31, day)) : 1;
  return `${y}.${pad2(m)}.${pad2(d)}`;
}

export function formatAnnouncementDate(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    const [year, month, day] = value.map((x) => (typeof x === 'number' ? x : Number(x)));
    if (!Number.isFinite(year)) return '';
    return fromParts(year, month, day);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const parts = trimmed.split(',').map((s) => Number(s.trim()));
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (year === undefined || !Number.isFinite(Number(year))) return '';
    return fromParts(Number(year), month ?? 1, day ?? 1);
  }

  return '';
}
