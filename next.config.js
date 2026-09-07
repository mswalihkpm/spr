/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'xlsx'],
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|mp4|woff2|woff)',
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

