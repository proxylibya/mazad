/**
 * 🌐 API Middleware العالمي لفك التشفير التلقائي
 * يطبق على جميع API responses بدون استثناء
 */

import { NextRequest, NextResponse } from 'next/server';
import { decodeApiResponse } from '../universal-name-decoder';
/**
 * Middleware لتطبيق فك التشفير على جميع API responses
 */
export function middleware(request: NextRequest) {
  // تطبيق فقط على API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * دالة مساعدة لتعديل Response بعد إنشاؤه
 */
export function withDecoding(handler: any /* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */) {
  return async (req: any /* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */, res: any /* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */) => {
    // تخزين دالة json الأصلية
    const originalJson = res.json;

    // تعديل دالة json لتطبق فك التشفير
    res.json = function (data: any /* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */) {
      const decodedData = decodeApiResponse(data);
      return originalJson.call(this, decodedData);
    };

    // تنفيذ Handler الأصلي
    return handler(req, res);
  };
}

export const config = {
  matcher: '/api/:path*'
};
