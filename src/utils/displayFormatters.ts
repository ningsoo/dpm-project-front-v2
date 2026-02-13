/**
 * 조회수: 100000 이상이면 '99999+'로 표시
 */
export function formatViews(views: number | null | undefined): string {
  const n = Number(views);
  if (!Number.isFinite(n) || n < 0) return '0';
  return n >= 100000 ? '99999+' : String(n);
}

/**
 * 댓글 수: 1000 이상이면 '999+'로 표시
 */
export function formatCommentCount(count: number | null | undefined): string {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '0';
  return n >= 1000 ? '999+' : String(n);
}
