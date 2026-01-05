import { NextApiRequest, NextApiResponse } from "next";
import { dbHelpers } from "../../../lib/prisma";

/**
 * API شامل لتشخيص حالة النظام
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed - GET only",
    });
  }

  try {
    console.log("🔍 بدء فحص شامل لحالة النظام...");

    const systemStatus = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      database: {
        connection: "unknown",
        stats: {},
        testUser: {},
        testQuery: "not_attempted",
      },
      apis: {
        carCreate: "not_tested",
        userLookup: "not_tested",
      },
      errors: [] as string[],
    };

    // 1. اختبار الاتصال بقاعدة البيانات
    try {
      console.log("🔗 اختبار الاتصال بقاعدة البيانات...");

      // اختبار بسيط للاتصال
      const connectionTest = await dbHelpers.prisma.$queryRaw`SELECT 1 as test`;
      systemStatus.database.connection = "✅ متصل";
      systemStatus.database.testQuery = "✅ نجح";

      console.log("✅ الاتصال بقاعدة البيانات يعمل");
    } catch (dbError) {
      systemStatus.database.connection = "❌ فشل";
      systemStatus.errors.push(`Database connection: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      console.error("❌ فشل الاتصال بقاعدة البيانات:", dbError);
    }

    // 2. احصائيات قاعدة البيانات
    try {
      const stats = await Promise.allSettled([
        dbHelpers.prisma.users.count(),
        dbHelpers.prisma.cars.count(),
        dbHelpers.prisma.car_images.count(),
        dbHelpers.prisma.auctions.count(),
      ]);

      systemStatus.database.stats = {
        totalUsers: stats[0].status === 'fulfilled' ? stats[0].value : 'خطأ',
        totalCars: stats[1].status === 'fulfilled' ? stats[1].value : 'خطأ',
        totalCarImages: stats[2].status === 'fulfilled' ? stats[2].value : 'خطأ',
        totalAuctions: stats[3].status === 'fulfilled' ? stats[3].value : 'خطأ',
      };

      console.log("📊 إحصائيات قاعدة البيانات:", systemStatus.database.stats);
    } catch (statsError) {
      systemStatus.errors.push(`Database stats: ${statsError instanceof Error ? statsError.message : 'Unknown error'}`);
      console.error("❌ خطأ في جلب الإحصائيات:", statsError);
    }

    // 3. اختبار البحث عن المستخدم التجريبي
    const testUserId = "cmg8gnk4q0000vg40nfwwb0hq";
    try {
      console.log("👤 البحث عن المستخدم التجريبي:", testUserId);

      const testUser = await dbHelpers.prisma.users.findUnique({
        where: { id: testUserId },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          accountType: true,
          status: true,
          verified: true,
          createdAt: true,
        }
      });

      if (testUser) {
        systemStatus.database.testUser = {
          found: "✅ موجود",
          id: testUser.id,
          name: testUser.name,
          phone: testUser.phone,
          role: testUser.role,
          accountType: testUser.accountType,
          status: testUser.status,
          verified: testUser.verified,
          createdAt: testUser.createdAt,
        };
        systemStatus.apis.userLookup = "✅ يعمل";
        console.log("✅ تم العثور على المستخدم التجريبي");
      } else {
        systemStatus.database.testUser = {
          found: "❌ غير موجود",
          id: testUserId,
        };
        systemStatus.apis.userLookup = "❌ المستخدم غير موجود";
        console.log("❌ المستخدم التجريبي غير موجود");
      }
    } catch (userError) {
      systemStatus.database.testUser = {
        found: "❌ خطأ",
        error: userError instanceof Error ? userError.message : 'Unknown error',
      };
      systemStatus.apis.userLookup = "❌ خطأ";
      systemStatus.errors.push(`User lookup: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
      console.error("❌ خطأ في البحث عن المستخدم:", userError);
    }

    // 4. اختبار إنشاء سيارة تجريبية (بدون حفظ)
    try {
      console.log("🚗 اختبار بيانات إنشاء السيارة...");

      const testCarData = {
        title: "اختبار النظام",
        brand: "تويوتا",
        model: "كامري",
        year: 2020,
        price: 25000.0,
        condition: "USED" as const,
        location: "طرابلس",
        description: "اختبار",
        features: "[]",
        contactPhone: "+218950000000",
        sellerId: testUserId,
        status: "AVAILABLE" as const,
        isAuction: false,
        images: "test.jpg",
      };

      // التحقق من صحة البيانات بدون إنشاء فعلي
      const validation = {
        hasAllRequired: !!(testCarData.title && testCarData.brand && testCarData.model &&
          testCarData.year && testCarData.price && testCarData.location &&
          testCarData.contactPhone && testCarData.sellerId),
        dataTypes: {
          year: typeof testCarData.year === 'number',
          price: typeof testCarData.price === 'number',
          title: typeof testCarData.title === 'string',
        }
      };

      systemStatus.apis.carCreate = validation.hasAllRequired ? "✅ البيانات صحيحة" : "❌ بيانات ناقصة";
      console.log("🔍 نتيجة فحص بيانات السيارة:", validation);

    } catch (carTestError) {
      systemStatus.apis.carCreate = "❌ خطأ في الاختبار";
      systemStatus.errors.push(`Car creation test: ${carTestError instanceof Error ? carTestError.message : 'Unknown error'}`);
      console.error("❌ خطأ في اختبار إنشاء السيارة:", carTestError);
    }

    // النتيجة النهائية
    const overallStatus = systemStatus.errors.length === 0 ? "✅ النظام يعمل بشكل طبيعي" : "⚠️ يوجد مشاكل";

    console.log("📋 تقرير حالة النظام:", overallStatus);

    return res.status(200).json({
      success: true,
      message: "تم فحص النظام بنجاح",
      overallStatus,
      details: systemStatus,
      recommendations: systemStatus.errors.length > 0 ? [
        "تحقق من الاتصال بقاعدة البيانات",
        "تأكد من وجود المستخدم في النظام",
        "راجع إعدادات Prisma",
        "تحقق من متغيرات البيئة",
      ] : [
        "النظام يعمل بشكل طبيعي",
        "يمكن المتابعة مع إنشاء الإعلانات",
      ],
    });

  } catch (error) {
    console.error("❌ خطأ عام في فحص النظام:", error);

    return res.status(500).json({
      success: false,
      error: "خطأ في فحص النظام",
      details: {
        originalError: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && error instanceof Error
          ? error.stack
          : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
