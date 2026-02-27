import { NextRequest, NextResponse } from "next/server";

/**
 * 프로덕션 CSP (요청별 nonce 기반)
 * - 프리뷰(.vercel.app)에서만 vercel.live 프레임 허용 (Vercel Toolbar 등)
 * - 운영 도메인에서는 vercel.live 허용하지 않음
 */
function buildProductionCsp(
  nonce: string,
  opts?: { allowVercelLive?: boolean }
): string {
  const frameSrc = [
    "https://*.tosspayments.com",
    "https://toss.im",
    "https://ui.teledit.com",
    "https://accounts.google.com",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    ...(opts?.allowVercelLive ? ["https://vercel.live"] : []),
  ].join(" ");

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com https://apis.google.com https://ssl.gstatic.com https://js.tosspayments.com`,
    // 기존 코드 유지: style-src는 unsafe-inline 허용
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://soundock-dev-uploads.s3.amazonaws.com https://soundock-prod-uploads.s3.amazonaws.com https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com https://*.googleusercontent.com https://*.tosspayments.com https://static.toss.im",
    "connect-src 'self' https://api.soundock.live https://www.googleapis.com https://www.google.com https://*.tosspayments.com wss://www.soundock.live",
    `frame-src ${frameSrc}`,
  ].join("; ");

  return csp;
}

export function middleware(request: NextRequest) {
  // 개발 환경에서는 CSP 적용하지 않음 (기존 로직 유지)
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // 프리뷰(= *.vercel.app)에서만 vercel.live 허용
  const host = request.nextUrl.hostname;
  const allowVercelLive = host.endsWith(".vercel.app");

  const csp = buildProductionCsp(nonce, { allowVercelLive });

  // nonce를 SSR/RSC에서 쓰는 경우를 대비해 request 헤더로 전달
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // request에 CSP를 세팅하는 건 불필요/혼동 유발 가능성이 커서 제거
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // 브라우저에 적용되는 CSP는 response 헤더로 내려야 함
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};