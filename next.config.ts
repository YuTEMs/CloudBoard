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

  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
};

export default nextConfig;
