import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import keydbClient from '../keydb';
import logger from '../logger';

/**
 * خيارات Middleware إلغاء الكاش
 */
interface InvalidateCacheOptions {
  /**
   * أنماط المفاتيح التي يجب إلغاؤها
   * مثال: ["admin:content:*", "admin:transport:*"]
   */
  patterns: string[];

  /**
   * تفعيل الإلغاء فقط على طرق HTTP معينة
   * الافتراضي: ["POST", "PUT", "PATCH", "DELETE"]
   */
  methods?: string[];

  /**
   * تسجيل العمليات في السجل
   */
  logging?: boolean;
}

/**
 * Higher-order function لإلغاء الكاش بعد عمليات التعديل
 *
 * يقوم بإلغاء المفاتيح المحددة من الكاش بعد نجاح العملية
 * على الـ API endpoint. يتم الإلغاء بشكل غير متزامن لتجنب
 * تأخير الاستجابة.
 *
 * @param options - خيارات إلغاء الكاش
 * @param handler - Handler الأصلي
 * @returns Handler جديد مع إلغاء الكاش
 *
 * @example
 * ```ts
 * export default withAdminAuth(
 *   withInvalidateCache({ patterns: [contentPattern()] }, handler)
 * );
 * ```
 */
export default function withInvalidateCache(
  options: InvalidateCacheOptions,
  handler: NextApiHandler,
): NextApiHandler {
  const { patterns = [], methods = ['POST', 'PUT', 'PATCH', 'DELETE'], logging = true } = options;

  return async (req: NextApiRequest, res: NextApiResponse) => {
    // تنفيذ الـ handler الأصلي
    const originalJson = res.json.bind(res);
    let responseIntercepted = false;

    // اعتراض الاستجابة لفحص النجاح
    res.json = function (body: any) {
      responseIntercepted = true;

      // تحقق من أن العملية نجحت والطريقة تتطلب إلغاء الكاش
      const shouldInvalidate =
        methods.includes(req.method?.toUpperCase() ?? '') &&
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        (body?.success === true || res.statusCode === 200 || res.statusCode === 201);

      if (shouldInvalidate && patterns.length > 0) {
        // إلغاء الكاش بشكل غير متزامن
        (async () => {
          try {
            let totalDeleted = 0;
            const startTime = Date.now();

            for (const pattern of patterns) {
              const keys = await keydbClient.keys(pattern);
              for (const key of keys) {
                const deleted = await keydbClient.del(key);
                if (deleted) totalDeleted++;
              }
            }

            const duration = Date.now() - startTime;

            if (logging) {
              logger.info('Cache invalidated after successful operation', {
                patterns,
                keysDeleted: totalDeleted,
                durationMs: duration,
                method: req.method,
                url: req.url,
              });
            }
          } catch (error) {
            // لا نريد أن يفشل الـ API بسبب خطأ في إلغاء الكاش
            logger.error('Failed to invalidate cache', {
              error: error instanceof Error ? error.message : error,
              patterns,
              method: req.method,
              url: req.url,
            });
          }
        })();
      }

      return originalJson(body);
    };

    // تنفيذ الـ handler الأصلي
    await handler(req, res);

    // في حال لم يتم استدعاء res.json
    if (!responseIntercepted) {
      res.json = originalJson;
    }
  };
}

/**
 * إلغاء الكاش بشكل يدوي
 *
 * @param patterns - أنماط المفاتيح للإلغاء
 * @returns عدد المفاتيح المحذوفة
 */
export async function invalidateCache(
  patterns: string[],
): Promise<{ deleted: number; duration: number; }> {
  const startTime = Date.now();
  let totalDeleted = 0;

  try {
    for (const pattern of patterns) {
      const keys = await keydbClient.keys(pattern);
      for (const key of keys) {
        const deleted = await keydbClient.del(key);
        if (deleted) totalDeleted++;
      }
    }

    const duration = Date.now() - startTime;

    logger.info(
      'Manual cache invalidation completed',
      {
        patterns,
        keysDeleted: totalDeleted,
        durationMs: duration,
      },
    );

    return { deleted: totalDeleted, duration };
  } catch (error) {
    logger.error('Failed to manually invalidate cache', {
      error: error instanceof Error ? error.message : error,
      patterns,
    });
    throw error;
  }
}
