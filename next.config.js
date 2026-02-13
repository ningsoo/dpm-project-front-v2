/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://soundock-alb-se1-75264038.ap-northeast-2.elb.amazonaws.com/api/:path*',
      },
    ];
  },
};
module.exports = nextConfig;
