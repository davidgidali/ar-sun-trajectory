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
};

module.exports = nextConfig;

