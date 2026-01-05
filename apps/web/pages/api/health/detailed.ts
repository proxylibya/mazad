import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';
import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: فحص صحة شامل مع تفاصيل النظام
 *     description: معلومات تفصيلية عن صحة التطبيق وموارد النظام
 *     tags:
 *       - Health Checks
 *     responses:
 *       200:
 *         description: تقرير صحة شامل
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // معلومات النظام
  const systemInfo = {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 100) / 100, // GB
    freeMemory: Math.round((os.freemem() / 1024 / 1024 / 1024) * 100) / 100, // GB
    memoryUsage: process.memoryUsage(),
    uptime: {
      system: os.uptime(),
      process: process.uptime(),
    },
  };

  // فحص قاعدة البيانات
  const databaseCheck = await checkDatabase();

  // فحص KeyDB
  const keydbCheck = await checkKeyDB();

  // فحص الذاكرة
  const memoryCheck = checkMemory();

  const allHealthy =
    databaseCheck.status === 'ok' && keydbCheck.status === 'ok' && memoryCheck.status === 'ok';

  const response = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    system: systemInfo,
    checks: {
      database: databaseCheck,
      keydb: keydbCheck,
      memory: memoryCheck,
    },
  };

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(allHealthy ? 200 : 503).json(response);
}

async function checkDatabase() {
  try {
    // prisma imported from @/lib/prisma
    const start = Date.now();

    // فحص الاتصال
    await prisma.$queryRaw`SELECT 1`;

    // عدد الاتصالات النشطة
    const connections = await prisma.$queryRaw<Array<{ count: bigint; }>>`
      SELECT count(*) as count FROM pg_stat_activity
    `;

    const latency = Date.now() - start;
    return {
      status: 'ok',
      latency,
      connections: Number(connections[0]?.count || 0),
      message: 'PostgreSQL healthy',
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

async function checkKeyDB() {
  try {
    let keydbUrl = process.env.KEYDB_URL || 'redis://localhost:6379';
    // تحويل keydb:// إلى redis:// لتوافق ioredis
    if (keydbUrl.startsWith('keydb://')) {
      keydbUrl = keydbUrl.replace('keydb://', 'redis://');
    }
    const redis = new Redis(keydbUrl);
    const start = Date.now();

    await redis.ping();
    const info = await redis.info('memory');
    const latency = Date.now() - start;

    // استخراج استخدام الذاكرة
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'unknown';

    await redis.quit();

    return {
      status: 'ok',
      latency,
      memoryUsed,
      message: 'KeyDB healthy',
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'KeyDB check failed',
    };
  }
}

function checkMemory() {
  const used = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  const usagePercent = Math.round((1 - free / total) * 100);

  const status = usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'warning' : 'ok';

  return {
    status,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(used.heapTotal / 1024 / 1024), // MB
    rss: Math.round(used.rss / 1024 / 1024), // MB
    external: Math.round(used.external / 1024 / 1024), // MB
    systemMemoryUsagePercent: usagePercent,
  };
}
