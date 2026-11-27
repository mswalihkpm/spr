/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'xlsx'],
    outputFileTracingIncludes: {
      '/api/og/share': [
        './public/branding/spr-official-banner.jpg',
        './public/spr-official-banner.jpg',
      ],
    },
    outputFileTracingExcludes: {
      '*': [
        './backups/**',
        './scripts/**',
        './src/scratch/**',
        './src/scripts/**',
        './public/branding/generated-previews/**',
        './public/branding/test-cards/**',
        './public/branding/phone-mockup-crop.png',
        './node_modules/@swc/**',
        './node_modules/typescript/**',
        './node_modules/@img/sharp-win32-*/**',
        './node_modules/@img/sharp-darwin-*/**',
        './node_modules/@img/sharp-libvips-darwin-*/**',
        './node_modules/.prisma/client/query_engine-windows.dll.node*',
        './node_modules/.prisma/client/libquery_engine-darwin*',
      ],
    },
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|png|webp|mp4|webm|woff2|woff)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
