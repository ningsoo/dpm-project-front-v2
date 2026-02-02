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

  getSettlementHistory: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/settlement', { params }),

  getReports: (params?: { start?: string; end?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/reports', { params }),

  deleteReports: (reportIds: string[]) =>
    fetchClient.delete<ApiResponse<unknown>>('/mypage/reports', { data: { reportIds } }),

  updatePassword: (currentPassword: string, newPassword: string) =>
    fetchClient.post<ApiResponse<unknown>>('/mypage/updatepassword', {
      currentPassword: currentPassword || undefined,
      newPassword,
    }),

  updateProfile: (body: { nickname?: string; phone?: string; profileImage?: string }) =>
    fetchClient.patch<ApiResponse<unknown>>('/mypage/updateprofile', body),

  getMessages: (params?: { page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>('/mypage/messages', { params }),

  getMessage: (messageId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/mypage/messages/${messageId}`),

  sendMessage: (userId: string, content: string) =>
    fetchClient.post<ApiResponse<unknown>>(`/mypage/message/send/${userId}`, { content }),

  deleteMessage: (messageId: string) =>
    fetchClient.delete<ApiResponse<unknown>>(`/mypage/messages/${messageId}`),
};
