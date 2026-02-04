import { fetchClient, noAuthClient } from './fetchClient';

/**
 * Passwordless API 실패 시 메시지 추출.
 * 공통 실패 JSON: { success: false, message: "", data: null } → response.data.message만 사용. msg 필드 사용 금지.
 * message가 비어 있거나 axios 기본문구("Request failed with status code ...")이면 fallback 반환. 사용자에게 axios 문구 절대 노출 금지.
 */
function getPasswordlessErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
  const message = data?.message;
  const trimmed = message != null && String(message).trim() !== '' ? String(message).trim() : '';
  if (!trimmed) return fallback;
  if (/request failed with status code\s*\d+/i.test(trimmed)) return fallback;
  return trimmed;
}

export interface SignupBody {
  email: string;
  password: string;
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
    fetchClient.post<ApiResponse<unknown>>('/auth/signup', body, { timeout: 30000 }),

  login: (body: LoginBody) =>
    fetchClient.post<ApiResponse<unknown>>('/auth/login', body),

  logout: () =>
    fetchClient.post<ApiResponse<unknown>>('/auth/logout'),

  withdraw: () =>
    fetchClient.delete<ApiResponse<unknown>>('/mypage/me'),

  checkEmail: (email: string) =>
    fetchClient.get<ApiResponse<{ available: boolean; message?: string | null }>>('/auth/email', {
      params: { email },
    }),

  checkNickname: (nickname: string) =>
    fetchClient.get<ApiResponse<{ available: boolean }>>('/auth/nickname', { params: { nickname } }),

  sendVerification: (email: string) =>
    fetchClient.post<ApiResponse<unknown>>('/auth/verification', { email }, { timeout: 30000 }),

  verifyStatus: (email: string) =>
    fetchClient.get<ApiResponse<{ verified: boolean; expired: boolean; email: string }>>(
      '/auth/verify/status',
      { params: { email }, timeout: 30000 }
    ),

  confirmVerification: (token: string) =>
    fetchClient.post<ApiResponse<unknown>>('/auth/verification', { token }),

  refresh: () =>
    fetchClient.post<ApiResponse<{ accessToken?: string }>>('/auth/refresh', {}),

  findEmail: (email: string) =>
    fetchClient.post<ApiResponse<null>>('/auth/find-email', { email }, { timeout: 30000 }),

  findPassword: (email: string) =>
    fetchClient.patch<ApiResponse<unknown>>('/auth/findpassword', { email }),

  resetPassword: (token: string, newPassword: string) =>
    fetchClient.patch<ApiResponse<unknown>>('/auth/findpassword', { token, newPassword }),

  // --- Passwordless (noAuthClient) ---
  // 실패 공통 JSON: { success: false, message: "", data: null }. 에러 메시지는 response.data.message만 사용.
  // 실패 시 throw Error(message) + (err as Error & { status?: number }).status 부착.

  /**
   * POST /passwordless/register  body: { email }
   * 200: A) res.data.qr  또는 B) res.data.data.qr (ApiResponse 래핑). qr base64면 data:image/png;base64, 프리픽스 부여.
   * 200인데 qr 비어있으면 throw "QR 응답이 비어 있습니다". 400/404/500: 공통 실패 JSON message.
   */
  async postPasswordlessRegister(email: string): Promise<{
    qrUrl: string;
    corpId?: string;
    registerKey?: string;
    terms?: number;
    serverUrl?: string;
    pushConnectorUrl?: string;
    pushConnectorToken?: string;
    userId?: string;
  }> {
    try {
      const res = await noAuthClient.post<Record<string, unknown> & { data?: Record<string, unknown> }>(
        '/passwordless/register',
        { email },
        { timeout: 15000 }
      );
      const raw = res.data;
      const d =
        raw &&
        typeof raw === 'object' &&
        'data' in raw &&
        raw.data &&
        typeof raw.data === 'object'
          ? (raw.data as Record<string, unknown>)
          : (raw as Record<string, unknown>) ?? {};
      let qr = d.qr != null ? String(d.qr).trim() : '';
      if (!qr) throw new Error('QR 응답이 비어 있습니다');
      if (!qr.toLowerCase().startsWith('data:')) qr = 'data:image/png;base64,' + qr;
      return {
        qrUrl: qr,
        corpId: d.corpId != null ? String(d.corpId) : undefined,
        registerKey: d.registerKey != null ? String(d.registerKey) : undefined,
        terms: typeof d.terms === 'number' && !Number.isNaN(d.terms) ? d.terms : undefined,
        serverUrl: d.serverUrl != null ? String(d.serverUrl) : undefined,
        pushConnectorUrl: d.pushConnectorUrl != null ? String(d.pushConnectorUrl) : undefined,
        pushConnectorToken: d.pushConnectorToken != null ? String(d.pushConnectorToken) : undefined,
        userId: d.userId != null ? String(d.userId) : undefined,
      };
    } catch (err) {
      const msg =
        err instanceof Error && err.message === 'QR 응답이 비어 있습니다'
          ? err.message
          : getPasswordlessErrorMessage(err, '등록 요청에 실패했습니다');
      const status = (err as { response?: { status?: number } })?.response?.status;
      const e = new Error(msg) as Error & { status?: number };
      e.status = status;
      throw e;
    }
  },

  /**
   * POST /passwordless/login-trigger  body: { email }
   * 200 성공 응답은 래핑: { result, msg, code, data: { term, pushConnectorUrl, pushConnectorToken, servicePassword, userId, sessionId } }.
   * res.data.data가 객체면 payload로 사용, 아니면 res.data를 payload로 사용(하위호환). userId는 이메일 문자열.
   */
  async postPasswordlessLoginTrigger(email: string): Promise<{
    code6: string;
    term?: number;
    pushConnectorUrl?: string;
    pushConnectorToken?: string;
    userId: string;
    sessionId: string;
  }> {
    try {
      const res = await noAuthClient.post<Record<string, unknown>>('/passwordless/login-trigger', { email }, { timeout: 15000 });
      const raw = res.data;
      const payload =
        raw &&
        typeof raw === 'object' &&
        'data' in raw &&
        raw.data &&
        typeof raw.data === 'object'
          ? (raw.data as Record<string, unknown>)
          : (raw as Record<string, unknown>) ?? {};
      const code6 = payload.servicePassword != null ? String(payload.servicePassword).trim() : '';
      const userId = payload.userId != null ? String(payload.userId).trim() : '';
      const sessionId = payload.sessionId != null ? String(payload.sessionId).trim() : '';
      if (!userId || !sessionId) throw new Error('로그인 정보를 받지 못했습니다');
      if (!code6) throw new Error('인증 코드를 받지 못했습니다');
      return {
        code6,
        term: typeof payload.term === 'number' && !Number.isNaN(payload.term) ? payload.term : undefined,
        pushConnectorUrl: payload.pushConnectorUrl != null ? String(payload.pushConnectorUrl) : undefined,
        pushConnectorToken: payload.pushConnectorToken != null ? String(payload.pushConnectorToken) : undefined,
        userId,
        sessionId,
      };
    } catch (err) {
      const msg = getPasswordlessErrorMessage(err, '로그인 요청에 실패했습니다');
      const status = (err as { response?: { status?: number } })?.response?.status;
      const e = new Error(msg) as Error & { status?: number };
      e.status = status;
      throw e;
    }
  },

  /**
   * GET /passwordless/result  query: { userId, sessionId }
   * 200: 래핑 { result, msg, code, data: { auth, userId, hash, accessToken } } 또는 flat. data가 객체면 payload=res.data.data, 아니면 payload=res.data.
   * 실패: 공통 JSON message → throw Error(message) + status
   */
  async getPasswordlessResult(params: { userId: string; sessionId: string }): Promise<{
    auth: string | null;
    userId?: string;
    hash?: string | null;
    accessToken?: string | null;
  }> {
    const { userId, sessionId } = params;
    try {
      const res = await noAuthClient.get<Record<string, unknown>>('/passwordless/result', {
        params: { userId, sessionId },
        timeout: 10000,
      });
      const raw = res.data as Record<string, unknown> | undefined;
      const payload =
        raw &&
        typeof raw === 'object' &&
        'data' in raw &&
        raw.data &&
        typeof raw.data === 'object'
          ? (raw.data as Record<string, unknown>)
          : (raw ?? {}) as Record<string, unknown>;
      const auth = payload.auth != null ? String(payload.auth) : null;
      const outUserId = payload.userId != null ? String(payload.userId) : undefined;
      const hash = payload.hash === null ? null : payload.hash != null ? String(payload.hash) : undefined;
      const accessToken =
        payload.accessToken === null
          ? null
          : payload.accessToken != null
            ? String(payload.accessToken)
            : undefined;
      return { auth, userId: outUserId, hash, accessToken };
    } catch (err) {
      const msg = getPasswordlessErrorMessage(err, '승인 확인에 실패했습니다');
      const status = (err as { response?: { status?: number } })?.response?.status;
      const e = new Error(msg) as Error & { status?: number };
      e.status = status;
      throw e;
    }
  },

  /**
   * GET /passwordless/status  query: { userId } (이메일 문자열)
   * 200: 래핑 구조 { result, msg, code, data } 에서 data 값만 반환. data는 { exist: boolean } 또는 legacy boolean.
   * 실패: throw Error(message) + status
   */
  async getPasswordlessStatus(userId: string): Promise<unknown> {
    try {
      const res = await noAuthClient.get<Record<string, unknown>>('/passwordless/status', {
        params: { userId },
        timeout: 10000,
      });
      const body = res.data as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') return undefined;
      const inner = body.data;
      if (
        inner !== undefined &&
        inner !== null &&
        typeof inner === 'object' &&
        'data' in (inner as Record<string, unknown>)
      ) {
        return (inner as Record<string, unknown>).data;
      }
      return inner;
    } catch (err) {
      const msg = getPasswordlessErrorMessage(err, '등록 상태 확인에 실패했습니다');
      const status = (err as { response?: { status?: number } })?.response?.status;
      const e = new Error(msg) as Error & { status?: number };
      e.status = status;
      throw e;
    }
  },

  /**
   * POST /passwordless/cancel  body: { email, sessionId }
   * 200: { ok: true }. 실패: throw Error(message) + status
   */
  async postPasswordlessCancel(body: { email: string; sessionId: string }): Promise<{ ok: boolean }> {
    try {
      await noAuthClient.post('/passwordless/cancel', body, { timeout: 10000 });
      return { ok: true };
    } catch (err) {
      const msg = getPasswordlessErrorMessage(err, '취소 요청에 실패했습니다');
      const status = (err as { response?: { status?: number } })?.response?.status;
      const e = new Error(msg) as Error & { status?: number };
      e.status = status;
      throw e;
    }
  },

  /**
   * POST /passwordless/withdrawal (인증 필요, fetchClient)
   */
  async postPasswordlessWithdrawal(): Promise<{ ok: boolean }> {
    try {
      await fetchClient.post('/passwordless/withdrawal', {}, { timeout: 10000 });
      return { ok: true };
    } catch (err) {
      throw new Error(getPasswordlessErrorMessage(err, '해지 요청에 실패했습니다'));
    }
  },
};
