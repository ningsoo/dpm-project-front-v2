import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export const mypageApi = {
  getMypage: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/me'),

  getPlaylist: (userId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/mypage/playlist/${userId}`),

  registerPlaylist: (body: { platform: 'spotify' | 'soundcloud'; url: string; title?: string }) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/playlist', body),

  deletePlaylist: (playlistId: string) =>
    fetchClient.delete<ApiResponse<unknown>>('/api/mypage/playlist', { params: { playlistId } }),

  getUserPosts: (userId: string, params?: { search?: string; page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/boards/${userId}`, { params }),

  getUserComments: (userId: string, params?: { search?: string; page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/comments/${userId}`, { params }),

  getLikedBoards: (params?: { page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/like-boards', { params }),

  getPaymentHistory: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/credit/history/buy', { params }),

  getCreditUsageHistory: (params?: { start?: string; end?: string; type?: 'donation' | 'advertisement' }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/support/sent', { params }),

  /** 후원 보낸내역(후원한 내역 조회) - GET /users/{userId}/donor (구 /mypage/support/sent 사용 안 함) */
  getDonationSent: (userId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/users/${userId}/donor`),

  /** 후원 받은내역(내가 받은 후원내역 조회) - GET /users/{userId}/acceptor (구 /mypage/support/received 사용 안 함) */
  getDonationReceived: (userId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/users/${userId}/acceptor`),

  getSettlementHistory: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/settlement', { params }),

  /** 내 정산 신청 내역 조회 - GET /mypage/settlements/history */
  getSettlementsHistory: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/settlements/history', { params }),

  /** 정산 계좌 정보 등록 - POST /mypage/settlements */
  registerSettlementAccount: (body: {
    email: string;
    name: string;
    phoneNumber: string;
    accountNumber: string;
  }) => fetchClient.post<ApiResponse<unknown>>('/api/mypage/settlements', body),

   /**  정산 가능 내역 조회 - GET /api/mypage/settlements/history/available  */
  getAvailableSettlements: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/settlements/history/available'),

  /** 정산 신청하기 - POST /mypage/settlements/request */
  requestSettlement: () =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/settlements/request'),

  getReports: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/reports', { params }),

  deleteReports: (reportIds: string[]) =>
    fetchClient.delete<ApiResponse<unknown>>('/api/mypage/reports', { data: { reportIds } }),

  verifyPassword: (password: string) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/password/verify', {
      password: password || undefined,
      currentPassword: password || undefined,
    }),

  updatePassword: (password: string) =>
    fetchClient.patch<ApiResponse<unknown>>('/api/mypage/mepasswd', { password }),

  updateProfile: (body: { nickname?: string; phoneNumber?: string }) =>
    fetchClient.patch<ApiResponse<unknown>>('/api/mypage/me', body),

  getMessages: (params?: { page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/messages', { params }),

  getMessage: (messageId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/mypage/messages/${messageId}`),

  sendMessage: (userId: string, content: string) =>
    fetchClient.post<ApiResponse<unknown>>(`/api/mypage/message/send/${userId}`, { content }),

  deleteMessage: (messageId: string) =>
    fetchClient.delete<ApiResponse<unknown>>(`/api/mypage/messages/${messageId}`),

  // YouTube Playlist APIs
  getYouTubePlaylists: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/playlist/youtube'),

  registerYouTubePlaylist: (body: { youtubeListId: string; title: string; thumbnailUrl: string; itemCount: number }) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/playlist', body),

  getMyPlaylists: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/playlist/me'),

  deleteYouTubePlaylist: (playlistId: number) =>
    fetchClient.delete<ApiResponse<unknown>>(`/api/mypage/playlist/${playlistId}`),

  getPlaylistTracks: (playlistId: number) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/mypage/playlist/${playlistId}/items`),

  /** POP 사용내역 - GET /mypage/pop-usage */
  getPopUsageHistory: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/pop-usage'),

  /** POP 구매내역 - GET /mypage/pop-purchase */
  getPopPurchaseHistory: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/pop-purchase'),

  /** POP 사용취소 - POST /mypage/pop-usage/cancel */
  cancelPopUsage: (body: { userId: number; popHistoryId: number; boardId?: number | null; cancelReason: string }) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/pop-usage/cancel', body),

  getInquiries: (params?: { page?: number; size?: number; startDate?: string; endDate?: string;}) =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/inquiry', { params }),

  /** 문의 상세 조회 - GET /mypage/inquiry/{userInquiryId} */
  getInquiryDetail: (userInquiryId: number) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/mypage/inquiry/${userInquiryId}`),

  /** 내가 쓴 게시글 조회 - GET /mypage/my-posts */
  getMyPosts: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/my-posts'),

  /** 내가 쓴 댓글 조회 - GET /mypage/my-comments */
  getMyComments: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/my-comments'),
};
