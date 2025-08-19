import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for production deployment
  experimental: {
    optimizePackageImports: ['@heroui/react', 'lucide-react']
  },
  
  // Configure headers for better performance
  async headers() {
    return [
      {
        source: '/display',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
