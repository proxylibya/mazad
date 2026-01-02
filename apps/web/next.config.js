const path = require('path');

/** @type {import('next').NextConfig} */

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || 'http://localhost:3022';

const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,

  // إزالة console.log في الإنتاج تلقائياً
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  experimental: {
    scrollRestoration: true,
    // تم تعطيل optimizeCss مؤقتاً لتجنب race conditions في البناء
    // optimizeCss: true,
    // تقليل عدد workers لتجنب race conditions على Windows
    workerThreads: false,
    cpus: 1,
  },

  // تم تمكين output file tracing لتجنب مشاكل في تجميع الملفات الداخلية على Vercel
  outputFileTracing: true,

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'sooq-mazad.ly' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.unsplash.com' },
      // OpenStreetMap Static Maps للساحات
      { protocol: 'https', hostname: 'staticmap.openstreetmap.de' },
      { protocol: 'https', hostname: 'tile.openstreetmap.org' },
    ],
    formats: ['image/avif', 'image/webp'],
    // تعطيل فشل البناء عند عدم وجود صورة
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    // زيادة الحد الأقصى للصور المخزنة
    minimumCacheTTL: 60,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  transpilePackages: [
    '@sooq-mazad/ui',
    '@sooq-mazad/utils',
    '@sooq-mazad/config',
    '@sooq-mazad/types',
  ],

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@sooq-mazad/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@sooq-mazad/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@sooq-mazad/config': path.resolve(__dirname, '../../packages/config/src'),
      '@sooq-mazad/types': path.resolve(__dirname, '../../packages/types/src'),
    };
    return config;
  },

  // إعادة توجيه مسارات Admin إلى تطبيق Admin المنفصل
  async redirects() {
    return [
      {
        source: '/admin',
        destination: `${ADMIN_APP_URL}/admin`,
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: `${ADMIN_APP_URL}/admin/:path*`,
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
