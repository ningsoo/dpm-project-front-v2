import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export const creditApi = {
  chargeRequest: (amount: number, payMethod: string) =>
    fetchClient.post<ApiResponse<{ orderId: string; redirectUrl?: string }>>(
      '/api/mypage/credit/charge/request',
      { amount, payMethod }
    ),

  chargeConfirm: (orderId: string, paymentKey: string, amount: number) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/credit/charge/confirm', {
      orderId,
      paymentKey,
      amount,
    }),

  chargeCancelRequest: (orderId: string) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/credit/charge/cancel/request', { orderId }),

  chargeCancelConfirm: (orderId: string, cancelReason: string) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/credit/charge/cancel/confirm', {
      orderId,
      cancelReason,
    }),

  donate: (userId: string, amount: number, message?: string) =>
    fetchClient.post<ApiResponse<unknown>>(`/api/users/${userId}/donations`, { amount, message }),

  cancelDonation: (userId: string, donationId: string) =>
    fetchClient.delete<ApiResponse<unknown>>(`/api/users/${userId}/donations/${donationId}`),

  getBalance: () =>
    fetchClient.get<ApiResponse<{ charged: number; used: number; remaining: number }>>('/api/mypage/balance'),

  cancelCreditUsage: (usageId: string) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/balance/cancel', { usageId }),

  // Settlements
  registerSettlement: (body: { bankCode: string; accountNumber: string; holderName: string }) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/settlements', body),

  getSettlementsAvailable: () =>
    fetchClient.get<ApiResponse<unknown>>('/api/mypage/settlements/available'),

  requestSettlement: (amount: number) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/settlements/request', { amount }),

  verifySettlementAccount: (body: { bankCode: string; accountNumber: string; holderName: string }) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/settlements/verification', body),

  cancelSettlementRequest: (requestId: string) =>
    fetchClient.post<ApiResponse<unknown>>('/api/mypage/settlements/cancel/request', { requestId }),
};
