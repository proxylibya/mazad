const path = require('path');

const OUTPUT_TRACE_ROOT = path.join(__dirname, '../../');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  outputFileTracing: true,

  experimental: {
    // Monorepo: اجعل tracing root هو جذر المستودع لتجنّب فقدان ملفات runtime عند النشر على Vercel
    outputFileTracingRoot: OUTPUT_TRACE_ROOT,
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

  images: {
    unoptimized: true, // تعطيل تحسين الصور لأنها من خادم آخر
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },

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

  async rewrites() {
    // استخدام متغير البيئة أو القيمة الافتراضية
    const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3021';

    return [
      {
        source: '/',
        destination: '/admin',
      },
      {
        source: '/api/admin/:path*',
        destination: '/api/admin/:path*',
      },
      {
        source: '/api/:path*',
        destination: `${webAppUrl}/api/:path*`,
      },
      // توجيه طلبات الصور إلى تطبيق الـ web (port 3021)
      {
        source: '/images/:path*',
        destination: `${webAppUrl}/images/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${webAppUrl}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
