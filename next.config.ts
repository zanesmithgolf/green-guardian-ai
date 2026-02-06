import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},  // Empty to silence Turbopack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback || {},
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;