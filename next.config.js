/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

/** 프로덕션 CSP: nonce 기반. 실제 nonce는 middleware에서 치환하여 적용 (placeholder: NEXT_NONCE) */
const prodCsp = `
default-src 'self';
base-uri 'self';
form-action 'self';
object-src 'none';
frame-ancestors 'self';
script-src 'self' 'nonce-NEXT_NONCE' 'strict-dynamic' https://accounts.google.com https://apis.google.com https://ssl.gstatic.com https://js.tosspayments.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https://soundock-dev-uploads.s3.amazonaws.com https://soundock-prod-uploads.s3.amazonaws.com https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com https://*.googleusercontent.com https://*.tosspayments.com https://static.toss.im;
connect-src 'self' https://api.soundock.live https://www.googleapis.com https://www.google.com https://*.tosspayments.com wss://www.soundock.live;
frame-src https://*.tosspayments.com https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com;
`;

const devCsp = `
default-src 'self' http: https:;
script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: https://js.tosspayments.com;
style-src 'self' 'unsafe-inline' http: https:;
img-src 'self' data: blob: http: https: https://*.tosspayments.com https://static.toss.im;
connect-src 'self' http: https: ws: wss: https://*.tosspayments.com;
frame-src http: https: https://*.tosspayments.com;
`;

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },

  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/v1/:path*', destination: `${backendUrl}/v1/:path*` },
      { source: '/oauth2/:path*', destination: `${backendUrl}/oauth2/:path*` },
    ];
  },

  async headers() {
    const baseHeaders = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ];
    if (isDev) {
      const csp = devCsp.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
      return [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: csp }, ...baseHeaders] }];
    }
    return [{ source: '/(.*)', headers: baseHeaders }];
  },
};

module.exports = nextConfig;