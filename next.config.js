/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};

module.exports = nextConfig;
