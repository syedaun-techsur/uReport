// next.config.ts  (MUST use .ts extension with Next.js 15+)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow Pivota Preview to embed this app in an iframe
  // DO NOT add X-Frame-Options or frame-ancestors CSP here
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // NOTE: Intentionally no X-Frame-Options header
          // NOTE: Intentionally no Content-Security-Policy frame-ancestors
        ],
      },
    ];
  },
  // Leaflet requires browser globals — ensure Leaflet deps don't break SSR
  serverExternalPackages: [],
};

export default nextConfig;
