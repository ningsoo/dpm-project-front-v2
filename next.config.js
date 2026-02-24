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

img-src 'self' data: https://soundock-dev-uploads.s3.amazonaws.com https://i.ytimg.com https://yt3.ggpht.com;

connect-src 'self' https://www.googleapis.com https://www.google.com;

frame-src https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com;
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
    const cspHeaderValue = csp
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeaderValue },
        ],
      },
    ];
  },
};

module.exports = nextConfig;