import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

/** 백엔드 AdminController 기준: /api/adm1n */
const ADMIN_BASE = '/api/adm1n';

export const adminApi = {
  /** 관리자 로그인 (POST /api/adm1n/login) */
  login: (body: { email: string; password: string }) =>
    fetchClient.post<ApiResponse<{ accessToken: string }>>(`${ADMIN_BASE}/login`, body),

  /** 후원 취소요청 리스트 조회 (GET /api/adm1n/donations/cancel-requests) */
  getCancelRequests: () =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/donations/cancel-requests`),

  /** 후원 취소 승인 (POST /api/adm1n/donations/cancel-requests/{transactionId}) */
  approveCancelDonation: (transactionId: string) =>
    fetchClient.post<ApiResponse<unknown>>(`${ADMIN_BASE}/donations/cancel-requests/${transactionId}`),

  getUsers: (params?: { page?: number; search?: string; status?: string }) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/users`, { params }),

  manageUser: (userId: string, body: { grade?: string; role?: string; status?: string }) =>
    fetchClient.patch<ApiResponse<unknown>>(`${ADMIN_BASE}/${userId}`, body),

  getBoards: (params?: { page?: number; category?: string }) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/boards`, { params }),

  deleteBoard: (boardId: string) =>
    fetchClient.delete<ApiResponse<unknown>>(`${ADMIN_BASE}/boards/${boardId}`),

  getComments: (params?: { page?: number; boardId?: string }) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/comments`, { params }),

  deleteComment: (commentId: string) =>
    fetchClient.delete<ApiResponse<unknown>>(`${ADMIN_BASE}/comments/${commentId}`),

  /** 관리자 1:1 문의 목록 (GET /api/adm1n/inquiries) */
  getInquiries: (params?: { page?: number; size?: number; sort?: string }) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/inquiries`, { params }),

  /** 관리자 1:1 문의 상세 (GET /api/adm1n/inquiries/{userInquiryId}) */
  getInquiry: (userInquiryId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/inquiries/${userInquiryId}`),

  /** 관리자 1:1 문의 답변 (PATCH /api/adm1n/inquiries/{userInquiryId}) */
  completeInquiry: (userInquiryId: string, body: { adminComment: string }) =>
    fetchClient.patch<ApiResponse<unknown>>(`${ADMIN_BASE}/inquiries/${userInquiryId}`, body),

  getReports: (params?: { page?: number; status?: string }) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/reports`, { params }),

  getReport: (reportId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/reports/${reportId}`),

  penalizeUser: (userId: string, body: { reason: string; type: string; until?: string }) =>
    fetchClient.post<ApiResponse<unknown>>(`${ADMIN_BASE}/reports/penalties/${userId}`, body),

  getPenalties: (params?: { page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/reports/penalties`, { params }),

  getPenalty: (userId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/reports/penalties/${userId}`),

  /** 정산 요청 내역 조회 (GET /api/adm1n/settlements) - List<AdminSettlementResponse> */
  getAdminSettlements: () =>
    fetchClient.get<ApiResponse<AdminSettlementResponse[]>>(`${ADMIN_BASE}/settlements`),

  getSettlements: (params?: { page?: number; status?: string }) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/settlements`, { params }),

  getSettlement: (boardId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`${ADMIN_BASE}/settlements/${boardId}`),

  approveSettlement: (boardId: string, body?: { memo?: string }) =>
    fetchClient.post<ApiResponse<unknown>>(`${ADMIN_BASE}/settlements/${boardId}`, body || {}),

  /** 정산 승인 (POST /settlements/approve/{popHistoryId}) */
  approveSettlementByPopHistoryId: (popHistoryId: number) =>
    fetchClient.post<ApiResponse<unknown>>(`${ADMIN_BASE}/settlements/approve/${popHistoryId}`),

  /** 정산 거절 (POST /settlements/reject/{popHistoryId}) */
  rejectSettlementByPopHistoryId: (popHistoryId: number) =>
    fetchClient.post<ApiResponse<unknown>>(`${ADMIN_BASE}/settlements/reject/${popHistoryId}`),

  /** 공지사항 목록 (GET /api/adm1n/announcement) - Pageable */
  getAnnouncements: (params?: { page?: number; size?: number }) =>
    fetchClient.get<ApiResponse<AnnouncementPageData>>(`${ADMIN_BASE}/announcement`, { params }),

  /** 공지사항 상세 (GET /api/adm1n/announcement/{announceId}) - 수정 폼 초기값용 */
  getAnnouncement: (announceId: number) =>
    fetchClient.get<ApiResponse<AnnouncementItem>>(`${ADMIN_BASE}/announcement/${announceId}`),

  /** 공지사항 삭제 (DELETE /api/adm1n/announcement/{announceId}) */
  deleteAnnouncement: (announceId: number) =>
    fetchClient.delete<ApiResponse<unknown>>(`${ADMIN_BASE}/announcement/${announceId}`),

  /** 공지사항 공지상태(priority)만 변경 (PATCH /api/adm1n/announcement/{announceId}, body: { data: { priority } }) */
  updateAnnouncementPriority: (announceId: number, priority: number) =>
    fetchClient.patch<ApiResponse<unknown>>(`${ADMIN_BASE}/announcement/${announceId}`, { data: { priority } }),
};

/** 정산 요청 내역 단건 (AdminSettlementResponse) */
export interface AdminSettlementResponse {
  popHistoryId: number;
  userId: number;
  nickName: string;
  changeAmount: number;
  requestedDatetime: string | null;
  approvedDatetime: string | null;
  popStatus: string;
}

/** 공지사항 목록 API data.data 구조 */
export interface AnnouncementItem {
  announceId: number;
  announceType?: string;
  title: string;
  content?: string;
  linkUrl?: string;
  priority: number;
  isActive?: boolean;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  fileUrls?: string[];
  attachmentIds?: string[];
}

export interface AnnouncementPageData {
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  size: number;
  content: AnnouncementItem[];
  number: number;
  last?: boolean;
}
