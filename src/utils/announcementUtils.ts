import type { AnnounceType, DateTimeArray } from '@/api/announcementTypes';
import { toDate } from './createdDateTime';

const ANNOUNCE_TYPE_LABEL: Record<AnnounceType, string> = {
  GENERAL: '일반공지',
  EMERGENCY: '긴급공지',
  EVENT: '이벤트',
  TERMS_OF_SERVICE: '이용약관',
  PRIVACY_POLICY: '개인정보',
};

export function getAnnounceTypeLabel(type: AnnounceType): string {
  return ANNOUNCE_TYPE_LABEL[type] ?? type;
}

/** YYYY.MM.DD 형식 */
function formatDateArray(arr: DateTimeArray | null | undefined): string {
  const d = toDate((arr ?? null) as number[] | null);
  if (!d) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/**
 * 기간 표기: startedAt ~ endedAt
 * endedAt이 null이면 "startedAt ~" (종료일 없음/상시)
 */
export function formatAnnouncePeriod(
  startedAt: DateTimeArray | null | undefined,
  endedAt: DateTimeArray | null | undefined
): string {
  const startStr = formatDateArray(startedAt ?? null);
  if (startStr === '—') return '—';
  const endStr = formatDateArray(endedAt ?? null);
  if (endStr === '—') return `${startStr} ~`;
  return `${startStr} ~ ${endStr}`;
}

/**
 * 기간을 시작/끝으로 분리 (목록에서 '~' 정렬용)
 * end가 null이면 종료일 없음(상시)
 */
export function getAnnouncePeriodParts(
  startedAt: DateTimeArray | null | undefined,
  endedAt: DateTimeArray | null | undefined
): { start: string; end: string | null } {
  const start = formatDateArray(startedAt ?? null);
  if (start === '—') return { start: '—', end: null };
  const end = formatDateArray(endedAt ?? null);
  return { start, end: end === '—' ? null : end };
}
