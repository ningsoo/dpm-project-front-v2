import { fetchClient } from './fetchClient';

export interface SignupBody {
  email: string;
  password: string;
  nickname: string;
  phone: string;
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
    fetchClient.post<ApiResponse<unknown>>('/auth/signup', body),

  login: (body: LoginBody) =>
    fetchClient.post<ApiResponse<unknown>>('/auth/login', body),

  logout: () =>
    fetchClient.post<ApiResponse<unknown>>('/auth/logout'),

  checkEmail: (email: string) =>
    fetchClient.get<ApiResponse<{ available: boolean }>>('/auth/email', { params: { email } }),

  sendVerification: (email: string) =>
    fetchClient.post<ApiResponse<unknown>>('/auth/verification', { email }),

  confirmVerification: (token: string) =>
    fetchClient.post<ApiResponse<unknown>>('/auth/verification', { token }),

  refresh: () =>
    fetchClient.post<ApiResponse<{ accessToken?: string }>>('/auth/refresh', {}),

  findPassword: (email: string) =>
    fetchClient.patch<ApiResponse<unknown>>('/auth/findpassword', { email }),

  resetPassword: (token: string, newPassword: string) =>
    fetchClient.patch<ApiResponse<unknown>>('/auth/findpassword', { token, newPassword }),
};
