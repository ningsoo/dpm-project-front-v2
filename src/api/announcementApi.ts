import { noAuthClient } from './fetchClient';
import type { ApiResponse } from './authApi';
import type {
  Announcement,
  AnnouncementByType,
  PageableAnnouncementResponse,
} from './announcementTypes';

/** 푸터 고정 공지 타입 (타입별 단건 API용) */
export type FooterAnnounceType = 'TERMS_OF_SERVICE' | 'EVENT' | 'PRIVACY_POLICY';

/**
 * 공지사항 목록 조회 (비회원 조회 가능)
 * GET /api/announcement?page={page}
 *
 * 공지사항 상세 조회 (비회원 조회 가능)
 * GET /api/announcement/[announceId]
 *
 * 타입별 단건 조회 - priority 0 단건 (이용약관/이벤트/개인정보)
 * GET /api/announcement/announce/[announceType]
 * 404: 해당 타입 공지 없음 또는 비활성
 */
export const announcementApi = {
  getList: (page = 0) =>
    noAuthClient.get<ApiResponse<PageableAnnouncementResponse>>('/api/announcement', {
      params: { page },
    }),

  getDetail: (announceId: number) =>
    noAuthClient.get<ApiResponse<Announcement>>(`/api/announcement/${announceId}`),

  getByType: (announceType: FooterAnnounceType) =>
    noAuthClient.get<ApiResponse<AnnouncementByType>>(
      `/api/announcement/announce/${announceType}`
    ),
};
