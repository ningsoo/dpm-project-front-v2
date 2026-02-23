import { fetchClient } from '@/api/fetchClient';
import { adminApi } from '@/api/adminApi';
import type { ApiResponse } from '@/api/authApi';
import type { AnnouncementItem } from '@/api/adminApi';

const ADMIN_ANNOUNCEMENT_BASE = '/api/adm1n/announcement';

/**
 * 공지사항 상세 조회 (수정 폼 초기값용)
 */
export async function getAnnouncementDetail(announceId: number): Promise<AnnouncementItem | null> {
  const res = await adminApi.getAnnouncement(announceId);
  const data = (res.data as ApiResponse<AnnouncementItem>)?.data;
  return data ?? null;
}

/**
 * 공지사항 작성 (multipart/form-data)
 * - data: JSON Blob (announceType, title, content, linkUrl, startedAt, endedAt)
 * - files: File (여러 개 append)
 * Content-Type은 FormData 전송 시 자동 설정 (boundary 수동 지정 금지)
 */
export async function createAnnouncement(
  announceType: string,
  formData: FormData
): Promise<void> {
  await fetchClient.post<ApiResponse<unknown>>(
    `${ADMIN_ANNOUNCEMENT_BASE}/announce/${encodeURIComponent(announceType)}`,
    formData
  );
}

/**
 * 공지사항 수정 (multipart/form-data)
 * - data: JSON Blob { announceType, title, content, linkUrl, priority, isActive, startedAt, endedAt } 전체 전송
 * - files: 새로 추가할 파일들 (append)
 */
export async function updateAnnouncement(
  announceId: number,
  formData: FormData
): Promise<void> {
  await fetchClient.patch<ApiResponse<unknown>>(
    `${ADMIN_ANNOUNCEMENT_BASE}/${announceId}`,
    formData
  );
}

/**
 * 공지사항 삭제 (DELETE /api/adm1n/announcement/{announceId})
 */
export async function deleteAnnouncement(announceId: number): Promise<void> {
  await adminApi.deleteAnnouncement(announceId);
}

/**
 * 공지사항 공지상태(priority)만 변경 (PATCH /api/adm1n/announcement/{announceId})
 * - 요청 body: { data: { priority } } 만 전송
 */
export async function updateAnnouncementPriority(announceId: number, priority: number): Promise<void> {
  await adminApi.updateAnnouncementPriority(announceId, priority);
}
