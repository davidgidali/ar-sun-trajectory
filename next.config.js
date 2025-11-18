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
  // Expose Vercel environment variables to the client
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || 'development',
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || '',
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL || '',
  },
};

module.exports = nextConfig;

