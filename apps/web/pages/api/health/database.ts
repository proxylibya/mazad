import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // اختبار الاتصال بقاعدة البيانات
    await prisma.$queryRaw`SELECT 1`;

    // اختبار استعلام بسيط
    const userCount = await prisma.users.count();
    const carCount = await prisma.cars.count();
    const auctionCount = await prisma.auctions.count();

    // معلومات قاعدة البيانات PostgreSQL
    let dbVersion = 'Unknown';
    try {
      const dbInfo = (await prisma.$queryRaw`SELECT version() as version`) as any[];
      dbVersion = dbInfo[0]?.version || 'Unknown';
    } catch (error) {
      dbVersion = 'Database Connected';
    }

    // فحص الجداول المطلوبة في PostgreSQL
    let existingTables: string[] = [];
    let missingTables: string[] = [];
    const requiredTables = ['users', 'cars', 'auctions'];

    try {
      const tables = (await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `) as any[];
      existingTables = tables.map((t: any) => (t.table_name || '').toLowerCase());
    } catch (error) {
      existingTables = ['تعذر الحصول على قائمة الجداول'];
    }

    missingTables = requiredTables.filter((table) => !existingTables.includes(table));

    return res.status(200).json({
      success: true,
      connected: true,
      message: 'قاعدة البيانات متصلة وتعمل بشكل صحيح',
      database: 'PostgreSQL',
      version: dbVersion,
      statistics: {
        users: userCount,
        cars: carCount,
        auctions: auctionCount,
        totalListings: carCount + auctionCount,
      },
      tables: {
        existing: existingTables,
        missing: missingTables,
        allRequired: missingTables.length === 0,
      },
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('خطأ في فحص قاعدة البيانات:', error);

    return res.status(500).json({
      success: false,
      connected: false,
      message: 'فشل في الاتصال بقاعدة البيانات',
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
      database: 'PostgreSQL',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
}
