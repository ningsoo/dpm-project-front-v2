import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const PROXY_TIMEOUT_MS = 60_000; // 백엔드 응답 대기 60초 (504 방지)

/** 디버깅용: 응답 헤더에만 넣고, JWT 값은 절대 포함하지 않음 */
function debugHeaders(authPresent: boolean, backendStatus: number | null) {
  return {
    'X-Debug-Auth-Present': authPresent ? 'true' : 'false',
    ...(backendStatus != null ? { 'X-Debug-Backend-Status': String(backendStatus) } : {}),
  };
}

/**
 * POST /api/passwordless/register 를 백엔드로 프록시.
 * Next.js rewrite 기본 타임아웃보다 긴 대기 시간을 사용해 504 Gateway Timeout을 줄임.
 * Authorization 없고 쿠키만 있으면 refresh로 accessToken 획득 후 Bearer로 재시도(선택).
 */
export async function POST(request: NextRequest) {
  const url = `${BACKEND_URL}/api/passwordless/register`;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body', data: null },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  const cookieHeader = request.headers.get('cookie') ?? undefined;
  let authHeader = request.headers.get('authorization') ?? undefined;
  const hasAuth = Boolean(authHeader);

  // Authorization 없고 쿠키 있을 때: refresh로 accessToken 획득 후 Bearer로 재시도
  if (!authHeader && cookieHeader && BACKEND_URL) {
    try {
      const refreshUrl = `${BACKEND_URL}/api/auth/refresh`;
      const refreshRes = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
        body: JSON.stringify({}),
      });
      const refreshData = (await refreshRes.json().catch(() => null)) as
        | { data?: { accessToken?: string }; accessToken?: string }
        | null;
      const accessToken =
        refreshData?.data?.accessToken ?? (refreshData as { accessToken?: string } | null)?.accessToken;
      if (accessToken && typeof accessToken === 'string') {
        authHeader = `Bearer ${accessToken}`;
      }
    } catch {
      // refresh 실패 시 그대로 프록시 (백엔드가 401 반환)
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 진단: Authorization 전달 여부, 백엔드 status (민감정보 미포함)
    const diag = debugHeaders(hasAuth || Boolean(authHeader), res.status);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[passwordless/register]', {
        authForwarded: Boolean(authHeader),
        backendStatus: res.status,
      });
    }

    const data = await res.json().catch(() => null);
    const response = NextResponse.json(data, { status: res.status });
    Object.entries(diag).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const status = isTimeout ? 504 : 502;
    const message = isTimeout
      ? '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
      : '백엔드 서버에 연결할 수 없습니다.';
    const response = NextResponse.json(
      { success: false, message, data: null },
      { status }
    );
    Object.entries(debugHeaders(hasAuth, null)).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }
}
