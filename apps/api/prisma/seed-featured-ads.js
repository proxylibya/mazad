const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function seedFeaturedAds() {
  try {
    console.log('بدء إنشاء بيانات الإعلانات المميزة التجريبية...');

    // البحث عن مستخدم موجود أو استخدام أول مستخدم متاح
    let testUser = await prisma.users.findFirst({
      where: {
        OR: [{ name: 'مدير الإعلانات' }, { role: 'ADMIN' }],
      },
    });

    if (!testUser) {
      // البحث عن أي مستخدم موجود
      testUser = await prisma.users.findFirst();

      if (!testUser) {
        // إنشاء مستخدم جديد برقم هاتف فريد
        const uniquePhone = `+21891${Date.now().toString().slice(-7)}`;
        testUser = await prisma.users.create({
          data: {
            id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name: 'مدير الإعلانات',
            phone: uniquePhone,
            loginIdentifier: `ads_manager_${Date.now()}`,
            role: 'ADMIN',
            verified: true,
            updatedAt: new Date(),
          },
        });
        console.log('تم إنشاء مستخدم تجريبي:', testUser.name);
      } else {
        console.log('استخدام مستخدم موجود:', testUser.name);
      }
    }

    // البحث عن سيارة موجودة للربط بالإعلان
    const existingCar = await prisma.cars.findFirst({
      where: { status: 'AVAILABLE' },
    });

    // البحث عن مزاد موجود للربط بالإعلان
    const existingAuction = await prisma.auctions.findFirst({
      where: { status: 'ACTIVE' },
    });

    // البحث عن معرض موجود للربط بالإعلان
    const existingShowroom = await prisma.showrooms.findFirst({
      where: { status: 'ACTIVE' },
    });

    // إنشاء إعلانات مميزة تجريبية
    const featuredAds = [];
    // إعلان مرتبط بسيارة
    if (existingCar) {
      const carAd = await prisma.featured_ads.create({
        data: {
          id: `feat_car_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          title: `${existingCar.brand} ${existingCar.model} ${existingCar.year} - عرض مميز`,
          description: `سيارة ${existingCar.brand} ${existingCar.model} موديل ${existingCar.year} في حالة ممتازة`,
          adType: 'CAR_LISTING',
          sourceId: existingCar.id,
          sourceType: 'car',
          position: 1,
          priority: 5,
          isActive: true,
          budget: 500.0,
          location: existingCar.location,
          createdBy: testUser.id,
          views: Math.floor(Math.random() * 100) + 50,
          clicks: Math.floor(Math.random() * 20) + 5,
          updatedAt: new Date(),
        },
      });
      featuredAds.push(carAd);
      console.log('تم إنشاء إعلان سيارة مميز:', carAd.title);
    }

    // إعلان مرتبط بمزاد
    if (existingAuction) {
      const auctionAd = await prisma.featured_ads.create({
        data: {
          id: `feat_auction_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          title: `مزاد حصري - ${existingAuction.title}`,
          description: `مزاد مباشر بسعر ابتدائي ${existingAuction.startPrice} د.ل`,
          adType: 'AUCTION_LISTING',
          sourceId: existingAuction.id,
          sourceType: 'auction',
          position: 2,
          priority: 4,
          isActive: true,
          budget: 300.0,
          createdBy: testUser.id,
          views: Math.floor(Math.random() * 150) + 80,
          clicks: Math.floor(Math.random() * 30) + 10,
          updatedAt: new Date(),
        },
      });
      featuredAds.push(auctionAd);
      console.log('تم إنشاء إعلان مزاد مميز:', auctionAd.title);
    }

    // إعلان مرتبط بمعرض
    if (existingShowroom) {
      const showroomAd = await prisma.featured_ads.create({
        data: {
          id: `feat_showroom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          title: `${existingShowroom.name} - معرض معتمد`,
          description: `معرض موثوق في ${existingShowroom.city} مع ${existingShowroom.totalCars} سيارة متاحة`,
          adType: 'SHOWROOM_AD',
          sourceId: existingShowroom.id,
          sourceType: 'showroom',
          position: 3,
          priority: 3,
          isActive: true,
          budget: 800.0,
          location: `${existingShowroom.city} - ${existingShowroom.area}`,
          createdBy: testUser.id,
          views: Math.floor(Math.random() * 200) + 100,
          clicks: Math.floor(Math.random() * 40) + 15,
          updatedAt: new Date(),
        },
      });
      featuredAds.push(showroomAd);
      console.log('تم إنشاء إعلان معرض مميز:', showroomAd.title);
    }

    // إعلان عام (غير مرتبط بمنشور)
    const genericAd = await prisma.featured_ads.create({
      data: {
        id: `feat_generic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        title: 'معرض الأمان للسيارات - عروض حصرية',
        description: 'أفضل السيارات بأسعار تنافسية مع ضمان الجودة',
        imageUrl: '/images/showroom-banner.jpg',
        linkUrl: '/showrooms',
        adType: 'GENERIC_AD',
        position: 1,
        priority: 5,
        isActive: true,
        budget: 1000.0,
        location: 'طرابلس - شارع الجمهورية',
        targetAudience: 'مشترو السيارات',
        createdBy: testUser.id,
        views: Math.floor(Math.random() * 300) + 200,
        clicks: Math.floor(Math.random() * 50) + 25,
        updatedAt: new Date(),
      },
    });
    featuredAds.push(genericAd);
    console.log('تم إنشاء إعلان عام مميز:', genericAd.title);

    console.log(`تم إنشاء ${featuredAds.length} إعلانات مميزة بنجاح!`);
    return featuredAds;
  } catch (error) {
    console.error('خطأ في إنشاء البيانات التجريبية:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedFeaturedAds();
    console.log('تم الانتهاء من إنشاء البيانات التجريبية بنجاح!');
  } catch (error) {
    console.error('فشل في إنشاء البيانات التجريبية:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedFeaturedAds };
