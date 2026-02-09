import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export const mypageApi = {
  getMypage: () =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/me'),

  getPlaylist: (userId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/mypage/playlist/${userId}`),

  registerPlaylist: (body: { platform: 'spotify' | 'soundcloud'; url: string; title?: string }) =>
    fetchClient.post<ApiResponse<unknown>>('/mypage/playlist', body),

  deletePlaylist: (playlistId: string) =>
    fetchClient.delete<ApiResponse<unknown>>('/mypage/playlist', { params: { playlistId } }),

  getUserPosts: (userId: string, params?: { search?: string; page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>(`/boards/${userId}`, { params }),

  getUserComments: (userId: string, params?: { search?: string; page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>(`/comments/${userId}`, { params }),

  getLikedBoards: (params?: { page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/like-boards', { params }),

  getPaymentHistory: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/credit/history/buy', { params }),

  getCreditUsageHistory: (params?: { start?: string; end?: string; type?: 'donation' | 'advertisement' }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/support/sent', { params }),

  /** 후원 보낸내역 - GET /mypage/support/sent (type: donation) */
  getDonationSent: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/support/sent', { params: { ...params, type: 'donation' } }),

  /** 후원 받은내역 - GET /mypage/support/received */
  getDonationReceived: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/support/received', { params }),

  getSettlementHistory: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/settlement', { params }),

  /** 내 정산 신청 내역 조회 - GET /mypage/settlements/history */
  getSettlementsHistory: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/settlements/history', { params }),

  /** 정산 계좌 정보 등록 - POST /mypage/settlements */
  registerSettlementAccount: (body: {
    email: string;
    username: string;
    phoneNumber: string;
    accountNumber: string;
  }) => fetchClient.post<ApiResponse<unknown>>('/mypage/settlements', body),

  /** 정산 신청하기 - POST /mypage/settlements/request */
  requestSettlement: () =>
    fetchClient.post<ApiResponse<unknown>>('/mypage/settlements/request'),

  getReports: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/reports', { params }),

  deleteReports: (reportIds: string[]) =>
    fetchClient.delete<ApiResponse<unknown>>('/mypage/reports', { data: { reportIds } }),

  verifyPassword: (password: string) =>
    fetchClient.post<ApiResponse<unknown>>('/mypage/password/verify', {
      password: password || undefined,
      currentPassword: password || undefined,
    }),

  updatePassword: (password: string) =>
    fetchClient.patch<ApiResponse<unknown>>('/mypage/mepasswd', { password }),

  updateProfile: (body: { nickname?: string; phoneNumber?: string }) =>
    fetchClient.patch<ApiResponse<unknown>>('/mypage/me', body),

  getMessages: (params?: { page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/messages', { params }),

  getMessage: (messageId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/mypage/messages/${messageId}`),

  sendMessage: (userId: string, content: string) =>
    fetchClient.post<ApiResponse<unknown>>(`/mypage/message/send/${userId}`, { content }),

  deleteMessage: (messageId: string) =>
    fetchClient.delete<ApiResponse<unknown>>(`/mypage/messages/${messageId}`),

  // YouTube Playlist APIs
  getYouTubePlaylists: () =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/playlist/youtube'),

  registerYouTubePlaylist: (body: { youtubeListId: string; title: string; thumbnailUrl: string; itemCount: number }) =>
    fetchClient.post<ApiResponse<unknown>>('/mypage/playlist', body),

  getMyPlaylists: () =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/playlist/me'),

  deleteYouTubePlaylist: (playlistId: number) =>
    fetchClient.delete<ApiResponse<unknown>>(`/mypage/playlist/${playlistId}`),

  getPlaylistTracks: (playlistId: number) =>
    fetchClient.get<ApiResponse<unknown>>(`/mypage/playlist/${playlistId}/items`),

  getInquiries: (params?: { page?: number; size?: number; startDate?: string; endDate?: string;}) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/inquiry', { params }),

  /** 문의 상세 조회 - GET /mypage/inquiry/{userInquiryId} */
  getInquiryDetail: (userInquiryId: number) =>
    fetchClient.get<ApiResponse<unknown>>(`/mypage/inquiry/${userInquiryId}`),
};
