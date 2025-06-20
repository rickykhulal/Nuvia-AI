
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: [
    'https://6000-firebase-studio-1749602934758.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev',
    'http://6000-firebase-studio-1749602934758.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev'
  ],
};

export default nextConfig;
