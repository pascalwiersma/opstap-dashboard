import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async redirects() {
    return [
      { source: '/beheerders', destination: '/gebruikers', permanent: true },
      { source: '/beheerders/nieuw', destination: '/gebruikers/nieuw', permanent: true },
      { source: '/beheerders/:id', destination: '/gebruikers/:id', permanent: true },
    ]
  },
};

export default nextConfig;
