import { fetchClient, PAYMENT_BASE } from './fetchClient';
import type { ApiResponse } from './authApi';

/** 결제 API 공통 응답 타입 */
export interface RestResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

/** POST {PAYMENT_BASE}/prepare - 결제 준비 (응답 data에 orderId 포함) */
export function preparePayment(changeAmount: number, amount: number) {
  return fetchClient.post<RestResponse<{ orderId: string }>>(`${PAYMENT_BASE}/prepare`, {
    changeAmount,
    amount,
  });
}

/** POST /v1/payments/confirm - 결제 확정 (/api prefix 미사용, baseURL만 사용) */
export function confirmPayment(orderId: string, paymentKey: string, amount: number) {
  return fetchClient.post<RestResponse<unknown>>('/v1/payments/confirm', {
    orderId,
    paymentKey,
    amount,
  });
}

/** POST /v1/payments/{paymentKey}/cancel - POP 구매 취소 (/api prefix 미사용) */
export function cancelPayment(paymentKey: string, cancelReason: string) {
  return fetchClient.post<RestResponse<unknown>>(`${PAYMENT_BASE}/${paymentKey}/cancel`, {
    cancelReason: cancelReason,
  });
}

export const creditApi = {
  /** 결제 준비 - /v1/payments/prepare 사용 (/api prefix 미사용) */
  chargeRequest: (amount: number, payMethod: string) =>
    fetchClient.post<ApiResponse<{ orderId: string; redirectUrl?: string }>>(
      `${PAYMENT_BASE}/prepare`,
      { amount, payMethod }
    ),

  /** 결제 확정 - /v1/payments/confirm 사용 (/api prefix 미사용) */
  chargeConfirm: (orderId: string, paymentKey: string, amount: number) =>
    fetchClient.post<ApiResponse<unknown>>(`${PAYMENT_BASE}/confirm`, {
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

  /** 게시글 작성자에게 POP 선물 (요청 body: changeAmount, message) */
  sendDonation: (targetUserId: number, body: { changeAmount: number; message: string }) =>
    fetchClient.post<ApiResponse<unknown>>(`/api/users/donations/${targetUserId}`, body),

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
