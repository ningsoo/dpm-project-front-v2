/** @type {import('next').NextConfig} */
const csp = `
default-src 'self';
base-uri 'self';
form-action 'self';
object-src 'none';
frame-ancestors 'self';

script-src 'self' https://accounts.google.com https://apis.google.com;

style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;

img-src 'self' data: https: https://soundock-dev-uploads.s3.amazonaws.com;

connect-src 'self' https://www.soundock.live;

frame-src https://accounts.google.com;
`;

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/v1/:path*',
        destination: `${backendUrl}/v1/:path*`,
      },
      {
        source: '/oauth2/:path*',
        destination: `${backendUrl}/oauth2/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;