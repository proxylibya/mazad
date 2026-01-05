/**
 * API مراقبة صحة النظام والأداء
 * System Health and Performance Monitoring API
 */

import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { errorHandlerMiddleware } from '../../../utils/advanced-error-handler';
import { LogLevel, logger } from '../../../utils/advanced-logger';
import { performanceMonitor } from '../../../utils/performance-monitor';

// فحص صحة قاعدة البيانات
async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

// فحص صحة الذاكرة
function checkMemoryHealth(): {
  status: 'healthy' | 'warning' | 'critical';
  usage: NodeJS.MemoryUsage;
  usagePercentage: number;
} {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const usagePercentage = (usedMemory / totalMemory) * 100;

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (usagePercentage > 90) {
    status = 'critical';
  } else if (usagePercentage > 75) {
    status = 'warning';
  }

  return {
    status,
    usage: memoryUsage,
    usagePercentage: Math.round(usagePercentage * 100) / 100,
  };
}

// فحص صحة العمليات
function checkOperationsHealth(): {
  status: 'healthy' | 'warning' | 'critical';
  activeOperations: number;
  recentErrors: number;
  errorRate: number;
  averageResponseTime: number;
} {
  const systemStats = performanceMonitor.getSystemStats();
  const recentOperations = performanceMonitor.getRecentOperations(100);

  const recentErrors = recentOperations.filter((op) => op.status === 'FAILED').length;
  const errorRate = recentOperations.length > 0 ? recentErrors / recentOperations.length : 0;

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (errorRate > 0.2 || systemStats.averageResponseTime > 5000) {
    status = 'critical';
  } else if (errorRate > 0.1 || systemStats.averageResponseTime > 3000) {
    status = 'warning';
  }

  return {
    status,
    activeOperations: systemStats.activeOperations,
    recentErrors,
    errorRate: Math.round(errorRate * 10000) / 100, // نسبة مئوية
    averageResponseTime: Math.round(systemStats.averageResponseTime),
  };
}

// فحص صحة النظام الشامل
async function performHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: any;
    memory: any;
    operations: any;
  };
  recommendations?: string[];
}> {
  const startTime = Date.now();

  await logger.logAPI(LogLevel.INFO, 'بدء فحص صحة النظام');

  // تشغيل جميع الفحوصات
  const [databaseHealth, memoryHealth, operationsHealth] = await Promise.all([
    checkDatabaseHealth(),
    Promise.resolve(checkMemoryHealth()),
    Promise.resolve(checkOperationsHealth()),
  ]);

  // تحديد الحالة العامة
  const statuses = [databaseHealth.status, memoryHealth.status, operationsHealth.status];
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (statuses.includes('critical')) {
    overallStatus = 'critical';
  } else if (statuses.includes('warning')) {
    overallStatus = 'warning';
  }

  // إنشاء التوصيات
  const recommendations: string[] = [];

  if (databaseHealth.status === 'unhealthy') {
    recommendations.push('فحص اتصال قاعدة البيانات وإعادة تشغيل الخدمة');
  }

  if (memoryHealth.status === 'critical') {
    recommendations.push('إعادة تشغيل التطبيق لتحرير الذاكرة');
  } else if (memoryHealth.status === 'warning') {
    recommendations.push('مراقبة استخدام الذاكرة عن كثب');
  }

  if (operationsHealth.status === 'critical') {
    recommendations.push('فحص الأخطاء الحديثة وتحسين الأداء');
  } else if (operationsHealth.status === 'warning') {
    recommendations.push('مراجعة العمليات البطيئة');
  }

  const healthReport = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: databaseHealth,
      memory: memoryHealth,
      operations: operationsHealth,
    },
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };

  await logger.logAPI(LogLevel.INFO, 'اكتمل فحص صحة النظام', {
    status: overallStatus,
    duration: Date.now() - startTime,
  });

  return healthReport;
}

// معالج طلبات فحص الصحة
async function handleHealthCheck(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    // التحقق من طريقة الطلب
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'طريقة غير مدعومة',
        allowedMethods: ['GET'],
      });
    }

    // تشغيل فحص الصحة
    const healthReport = await performHealthCheck();

    // تحديد كود الاستجابة حسب الحالة
    let statusCode = 200;
    if (healthReport.status === 'warning') {
      statusCode = 200; // لا نزال نعمل
    } else if (healthReport.status === 'critical') {
      statusCode = 503; // خدمة غير متاحة
    }

    res.status(statusCode).json({
      success: true,
      data: healthReport,
    });
  } catch (error) {
    await logger.logAPI(LogLevel.ERROR, 'خطأ في فحص صحة النظام', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'خطأ في فحص صحة النظام',
      status: 'critical',
      timestamp: new Date().toISOString(),
    });
  }
}

// معالج طلبات إحصائيات الأداء
async function handlePerformanceStats(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'طريقة غير مدعومة',
      });
    }

    const systemStats = performanceMonitor.getSystemStats();
    const recentOperations = performanceMonitor.getRecentOperations(50);
    const activeOperations = performanceMonitor.getActiveOperations();

    // إحصائيات العمليات حسب النوع
    const operationTypes = recentOperations.reduce(
      (acc, op) => {
        const type = op.operationName.split(' ')[0]; // أول كلمة
        if (!acc[type]) {
          acc[type] = { count: 0, totalDuration: 0, errors: 0 };
        }
        acc[type].count++;
        acc[type].totalDuration += op.duration || 0;
        if (op.status === 'FAILED') {
          acc[type].errors++;
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    // حساب المتوسطات
    Object.keys(operationTypes).forEach((type) => {
      const stats = operationTypes[type];
      stats.averageDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;
      stats.errorRate = stats.count > 0 ? stats.errors / stats.count : 0;
    });

    const performanceReport = {
      timestamp: new Date().toISOString(),
      system: systemStats,
      operations: {
        active: activeOperations.length,
        recent: recentOperations.length,
        byType: operationTypes,
      },
      recentOperations: recentOperations.slice(0, 10).map((op) => ({
        name: op.operationName,
        duration: op.duration,
        status: op.status,
        timestamp: op.endTime ? new Date(op.endTime).toISOString() : null,
      })),
    };

    res.status(200).json({
      success: true,
      data: performanceReport,
    });
  } catch (error) {
    await logger.logAPI(LogLevel.ERROR, 'خطأ في جلب إحصائيات الأداء', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'خطأ في جلب إحصائيات الأداء',
    });
  }
}

// المعالج الرئيسي
async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { endpoint } = req.query;

  switch (endpoint) {
    case 'health':
      return handleHealthCheck(req, res);
    case 'performance':
      return handlePerformanceStats(req, res);
    default:
      return res.status(404).json({
        success: false,
        error: 'نقطة نهاية غير موجودة',
        availableEndpoints: ['health', 'performance'],
      });
  }
}

export default errorHandlerMiddleware(handler);
