/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const prodCsp = `
default-src 'self';
base-uri 'self';
form-action 'self';
object-src 'none';
frame-ancestors 'self';

script-src 'self' 'unsafe-inline'
  https://accounts.google.com
  https://apis.google.com
  https://ssl.gstatic.com;

style-src 'self' 'unsafe-inline'
  https://fonts.googleapis.com;

font-src 'self'
  https://fonts.gstatic.com
  data:;

img-src 'self' data:
  https://soundock-dev-uploads.s3.amazonaws.com
  https://soundock-prod-uploads.s3.amazonaws.com
  https://i.ytimg.com
  https://img.youtube.com
  https://yt3.ggpht.com
  https://*.googleusercontent.com;

connect-src 'self'
  https://api.soundock.live
  https://www.googleapis.com
  https://www.google.com
  https://api.tosspayments.com
  https://log.tosspayments.com
  wss://www.soundock.live;

frame-src
  https://accounts.google.com
  https://www.youtube.com
  https://www.youtube-nocookie.com;
`;

const devCsp = `
default-src 'self' http: https:;
script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:;
style-src 'self' 'unsafe-inline' http: https:;
img-src 'self' data: blob: http: https:;
connect-src 'self' http: https: ws: wss:;
frame-src http: https:;
`;

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },

  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/v1/:path*', destination: `${backendUrl}/v1/:path*` },
      { source: '/oauth2/:path*', destination: `${backendUrl}/oauth2/:path*` },
    ];
  },

  async headers() {
    const csp = (isDev ? devCsp : prodCsp)
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;