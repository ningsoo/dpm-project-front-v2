import { fetchClient } from './fetchClient';

export interface SignupBody {
  email: string;
  password: string;
  name: string;
  nickname: string;
  phoneNumber: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

export const authApi = {
  signup: (body: SignupBody) =>
    fetchClient.post<ApiResponse<unknown>>('/api/auth/signup', body, { timeout: 30000 }),

  login: (body: LoginBody) =>
    fetchClient.post<ApiResponse<unknown>>('/api/auth/login', body),

  logout: () =>
    fetchClient.post<ApiResponse<unknown>>('/api/auth/logout'),

  withdraw: () =>
    fetchClient.delete<ApiResponse<unknown>>('/api/mypage/me'),

  checkEmail: (email: string) =>
    fetchClient.get<ApiResponse<{ available: boolean; message?: string | null }>>('/api/auth/email', {
      params: { email },
    }),

  checkNickname: (nickname: string) =>
    fetchClient.get<ApiResponse<{ available: boolean }>>('/api/auth/nickname', { params: { nickname } }),

  sendVerification: (email: string) =>
    fetchClient.post<ApiResponse<unknown>>('/api/auth/verification', { email }, { timeout: 30000 }),

  verifyStatus: (email: string) =>
    fetchClient.get<ApiResponse<{ verified: boolean; expired: boolean; email: string }>>(
      '/api/auth/verify/status',
      { params: { email }, timeout: 30000 }
    ),

  confirmVerification: (token: string) =>
    fetchClient.post<ApiResponse<unknown>>('/api/auth/verification', { token }),

  refresh: () =>
    fetchClient.post<ApiResponse<{ accessToken?: string }>>('/api/auth/refresh', {}),

  findEmail: (email: string) =>
    fetchClient.post<ApiResponse<null>>('/api/auth/find-email', { email }, { timeout: 30000 }),

  findPassword: (email: string) =>
    fetchClient.patch<ApiResponse<unknown>>('/api/auth/findpassword', { email }),

  resetPassword: (token: string, newPassword: string) =>
    fetchClient.patch<ApiResponse<unknown>>('/api/auth/findpassword', { token, newPassword }),
};
