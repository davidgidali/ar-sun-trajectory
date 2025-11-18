/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for camera and geolocation APIs
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, geolocation=*',
          },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

module.exports = nextConfig;

