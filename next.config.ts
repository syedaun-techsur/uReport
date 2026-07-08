// next.config.ts  (MUST use .ts extension with Next.js 15+)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow Pivota preview proxy to serve _next/* assets cross-origin.
  // Without this, Next.js 14.x+ blocks _next/static/* and _next/image/*
  // requests from the preview domain and hydration fails silently.
  // Pattern covers both the sandbox preview URL and local dev.
  allowedDevOrigins: [
    '*.preview.pivota-ng-develop.pivota.dev',
    '*.preview.daytona.io',
    '*.daytona.work',
    'localhost',
  ],
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
