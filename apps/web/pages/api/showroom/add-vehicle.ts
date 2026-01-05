import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // استخراج البيانات من الطلب
    const { carData, images, userId } = req.body;

    console.log('📥 البيانات المستلمة:', {
      hasCarData: !!carData,
      hasImages: !!images,
      hasUserId: !!userId,
      carDataKeys: carData ? Object.keys(carData) : [],
      imagesCount: images ? images.length : 0,
    });

    if (!carData) {
      return res.status(400).json({ error: 'بيانات السيارة مطلوبة' });
    }

    const {
      showroomId,
      title,
      brand,
      model,
      year,
      price,
      condition,
      mileage,
      bodyType,
      fuelType,
      transmission,
      description,
      contactPhone,
      city,
      detailedAddress,
      exteriorColor,
      interiorColor,
      engineSize,
      regionalSpec,
      seatCount,
      chassisNumber,
      engineNumber,
      features,
    } = carData;

    // التحقق من البيانات المطلوبة
    console.log('البحث فحص البيانات المطلوبة:', {
      showroomId,
      title,
      brand,
      model,
      year,
      price,
      userId,
    });

    if (!showroomId || !title || !brand || !model || !year || !price || !userId) {
      const missingFields = [];
      if (!showroomId) missingFields.push('showroomId');
      if (!title) missingFields.push('title');
      if (!brand) missingFields.push('brand');
      if (!model) missingFields.push('model');
      if (!year) missingFields.push('year');
      if (!price) missingFields.push('price');
      if (!userId) missingFields.push('userId');

      console.error('فشل بيانات مطلوبة مفقودة:', missingFields);

      return res.status(400).json({
        error: 'البيانات المطلوبة مفقودة',
        required: ['showroomId', 'title', 'brand', 'model', 'year', 'price', 'userId'],
        missing: missingFields,
      });
    }

    // التحقق من وجود المعرض وأن المستخدم هو المالك
    const showroom = await prisma.showrooms.findFirst({
      where: {
        id: showroomId,
        ownerId: userId,
      },
    });

    if (!showroom) {
      return res.status(404).json({
        error: 'المعرض غير موجود أو ليس لديك صلاحية للإضافة إليه',
      });
    }

    // إنشاء المركبة الجديدة
    console.log('السيارة إنشاء مركبة جديدة بالبيانات:', {
      title,
      brand,
      model,
      year: parseInt(year),
      price: parseFloat(price),
      showroomId,
      userId,
    });

    const now = new Date();
    const newCar = await prisma.cars.create({
      data: {
        title,
        brand,
        model,
        year: parseInt(year),
        price: parseFloat(price),
        condition:
          condition === 'جديد' ? 'NEW' : condition === 'تحتاج صيانة' ? 'NEEDS_REPAIR' : 'USED',
        mileage: mileage ? parseInt(mileage) : null,
        bodyType,
        fuelType,
        transmission,
        description,
        contactPhone,
        location: city || `${showroom.area}، ${showroom.city}`,
        locationAddress: detailedAddress || showroom.address,
        color: exteriorColor,
        interiorColor,
        regionalSpecs: regionalSpec,
        seatCount: seatCount || null,
        chassisNumber,
        engineNumber,
        images: JSON.stringify(images || []),
        features: JSON.stringify(features || []),
        sellerId: userId,
        showroomId: showroomId,
        status: 'AVAILABLE',
        createdAt: now,
        updatedAt: now,
      },
    });

    // إنشاء سجلات الصور إذا كانت موجودة
    if (images && images.length > 0) {
      const imageRecords = images.map((image: any, index: number) => ({
        carId: newCar.id,
        fileName: image.fileName || `car_image_${index + 1}.jpg`,
        fileUrl: image.url,
        fileSize: image.fileSize || 0,
        isPrimary: index === 0,
        uploadedBy: userId,
        category: 'showroom',
      }));

      await prisma.car_images.createMany({
        data: imageRecords,
      });
    }

    // إرجاع البيانات مع معلومات المعرض والصور
    const carWithDetails = await prisma.cars.findUnique({
      where: { id: newCar.id },
      include: {
        car_images: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            isPrimary: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        showrooms: {
          select: {
            id: true,
            name: true,
            city: true,
            area: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    const normalizedCar = carWithDetails
      ? {
        ...carWithDetails,
        carImages: carWithDetails.car_images,
        showroom: carWithDetails.showrooms,
        seller: carWithDetails.users,
      }
      : null;

    console.log('تم بنجاح تم إنشاء مركبة جديدة للمعرض:', {
      carId: newCar.id,
      showroomId: showroomId,
      showroomName: showroom.name,
      carTitle: title,
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المركبة للمعرض بنجاح',
      car: normalizedCar,
    });
  } catch (error) {
    console.error('فشل خطأ في إضافة المركبة للمعرض:', error);

    // تحديد نوع الخطأ
    let errorMessage = 'حدث خطأ أثناء إضافة المركبة للمعرض';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        errorMessage = 'المركبة موجودة مسبقاً';
        statusCode = 409;
      } else if (error.message.includes('Foreign key constraint')) {
        errorMessage = 'معرف المعرض أو المستخدم غير صحيح';
        statusCode = 400;
      } else if (error.message.includes('Required')) {
        errorMessage = 'بعض البيانات المطلوبة مفقودة';
        statusCode = 400;
      }
    }

    res.status(statusCode).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === 'development'
          ? {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          }
          : undefined,
    });
  }
}
