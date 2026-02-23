/**
 * 백엔드 createdDateTime은
 * [year, month, day, hour, minute, second] 형태의 number[]입니다.
 */
export function toDate(createdDateTime: (number | undefined)[] | null | undefined): Date | null {
  if (!Array.isArray(createdDateTime) || createdDateTime.length < 3) return null;
  
  const [y, m, d, hh = 0, mm = 0, ss = 0] = createdDateTime;
  if (typeof y !== 'number' || typeof m !== 'number' || typeof d !== 'number') return null;
  
  const date = new Date(y, m - 1, d, hh, mm, ss);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCreatedDateTime(createdDateTime: (number | undefined)[] | null | undefined): string {
  const d = toDate(createdDateTime);
  if (!d) return '—';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** 상세 페이지 등에서 날짜+시간 표시용 */
export function formatCreatedDateTimeFull(createdDateTime: (number | undefined)[] | null | undefined): string {
  const d = toDate(createdDateTime);
  if (!d) return '—';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO 문자열 또는 number[]를 YYYY.MM.DD HH:mm 형식으로 변환 (알림 등) */
export function formatNotificationDate(
  value: string | number[] | null | undefined
): string {
  if (value == null) return '—';
  let d: Date | null;
  if (Array.isArray(value)) {
    d = toDate(value);
  } else if (typeof value === 'string') {
    d = new Date(value);
    if (Number.isNaN(d.getTime())) d = null;
  } else {
    return '—';
  }
  if (!d) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

