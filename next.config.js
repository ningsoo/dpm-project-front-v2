/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
