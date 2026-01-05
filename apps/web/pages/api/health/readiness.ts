import Redis from 'ioredis';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

/**
 * @swagger
 * /api/health/readiness:
 *   get:
 *     summary: فحص جاهزية التطبيق الكاملة
 *     description: يتحقق من جاهزية التطبيق وجميع الخدمات المرتبطة
 *     tags:
 *       - Health Checks
 *     responses:
 *       200:
 *         description: التطبيق جاهز ويعمل بشكل كامل
 *       503:
 *         description: التطبيق غير جاهز
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks: Record<string, { status: string; message?: string; latency?: number; }> = {
    app: { status: 'ok' },
  };

  // فحص قاعدة البيانات
  try {
    // prisma imported from @/lib/prisma
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    checks.database = {
      status: 'ok',
      latency,
      message: 'PostgreSQL connected',
    };
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }

  // فحص KeyDB (اختياري للتجربة)
  const rawKeydbUrl = process.env.KEYDB_URL;
  if (!rawKeydbUrl) {
    checks.keydb = {
      status: 'ok',
      message: 'KeyDB not configured (KEYDB_URL is not set)',
    };
  } else {
    try {
      let keydbUrl = rawKeydbUrl;
      // تحويل keydb:// إلى redis:// لتوافق ioredis
      if (keydbUrl.startsWith('keydb://')) {
        keydbUrl = keydbUrl.replace('keydb://', 'redis://');
      }
      const redis = new Redis(keydbUrl);
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;
      await redis.quit();

      checks.keydb = {
        status: 'ok',
        latency,
        message: 'KeyDB connected',
      };
    } catch (error) {
      checks.keydb = {
        status: 'error',
        message: error instanceof Error ? error.message : 'KeyDB connection failed',
      };
    }
  }

  // تحديد الحالة الإجمالية
  const allHealthy = Object.values(checks).every((check) => check.status === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  const response = {
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
  };

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(statusCode).json(response);
}
