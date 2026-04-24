import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'aura-bakery-shop.firebasestorage.app',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;