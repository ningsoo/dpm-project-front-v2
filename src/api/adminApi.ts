import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export const adminApi = {
  getUsers: (params?: { page?: number; search?: string; status?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/admin/users', { params }),

  manageUser: (userId: string, body: { grade?: string; role?: string; status?: string }) =>
    fetchClient.patch<ApiResponse<unknown>>(`/api/admin/${userId}`, body),

  getBoards: (params?: { page?: number; category?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/admin/boards', { params }),

  deleteBoard: (boardId: string) =>
    fetchClient.delete<ApiResponse<unknown>>(`/api/admin/boards/${boardId}`),

  getComments: (params?: { page?: number; boardId?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/admin/comments', { params }),

  deleteComment: (commentId: string) =>
    fetchClient.delete<ApiResponse<unknown>>(`/api/admin/comments/${commentId}`),

  getInquiries: (params?: { page?: number; status?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/admin/inquiries', { params }),

  getInquiry: (inquiryId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/admin/inquiries/${inquiryId}`),

  completeInquiry: (inquiryId: string, body: { reply?: string }) =>
    fetchClient.post<ApiResponse<unknown>>(`/api/admin/inquiries/${inquiryId}`, body),

  getReports: (params?: { page?: number; status?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/admin/reports', { params }),

  getReport: (reportId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/admin/reports/${reportId}`),

  penalizeUser: (userId: string, body: { reason: string; type: string; until?: string }) =>
    fetchClient.post<ApiResponse<unknown>>(`/api/admin/reports/penalties/${userId}`, body),

  getPenalties: (params?: { page?: number }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/admin/reports/penalties', { params }),

  getPenalty: (userId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/admin/reports/penalties/${userId}`),

  getSettlements: (params?: { page?: number; status?: string }) =>
    fetchClient.get<ApiResponse<unknown>>('/api/admin/settlements', { params }),

  getSettlement: (boardId: string) =>
    fetchClient.get<ApiResponse<unknown>>(`/api/admin/settlements/${boardId}`),

  approveSettlement: (boardId: string, body?: { memo?: string }) =>
    fetchClient.post<ApiResponse<unknown>>(`/api/admin/settlements/${boardId}`, body || {}),
};
