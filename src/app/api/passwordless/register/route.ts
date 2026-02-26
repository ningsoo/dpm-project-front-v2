import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const PROXY_TIMEOUT_MS = 60_000; // 백엔드 응답 대기 60초 (504 방지)

/**
 * POST /api/passwordless/register 를 백엔드로 프록시.
 * Next.js rewrite 기본 타임아웃보다 긴 대기 시간을 사용해 504 Gateway Timeout을 줄임.
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

  try {
    const cookieHeader = request.headers.get('cookie') ?? undefined;
    const authHeader = request.headers.get('authorization') ?? undefined;
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

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const status = isTimeout ? 504 : 502;
    const message = isTimeout
      ? '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
      : '백엔드 서버에 연결할 수 없습니다.';
    return NextResponse.json(
      { success: false, message, data: null },
      { status }
    );
  }
}
