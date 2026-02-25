import { NextRequest, NextResponse } from 'next/server';

/** 프로덕션 CSP (next.config.js prodCsp와 동일, NEXT_NONCE를 요청별 nonce로 치환) */
function buildProductionCsp(nonce: string): string {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com https://apis.google.com https://ssl.gstatic.com https://js.tosspayments.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://soundock-dev-uploads.s3.amazonaws.com https://soundock-prod-uploads.s3.amazonaws.com https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com https://*.googleusercontent.com",
    "connect-src 'self' https://api.soundock.live https://www.googleapis.com https://www.google.com https://*.tosspayments.com wss://www.soundock.live",
    "frame-src https://*.tosspayments.com https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com",
  ].join('; ');
  return csp;
}

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildProductionCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
