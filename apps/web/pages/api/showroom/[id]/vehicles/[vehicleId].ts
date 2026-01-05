import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id: showroomId, vehicleId } = req.query;

    console.log('البحث API Debug:', { showroomId, vehicleId });

    // البحث عن السيارة في قاعدة البيانات
    const car = await prisma.cars.findFirst({
      where: {
        id: vehicleId as string,
        showroomId: showroomId as string,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            verified: true,
          },
        },
        car_images: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            isPrimary: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!car) {
      console.log('فشل السيارة غير موجودة');
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    console.log('تم بنجاح تم العثور على السيارة:', car.title);

    // تحويل البيانات للتنسيق المطلوب
    const formattedCar = {
      id: car.id,
      title: car.title,
      price: car.price.toString(),
      condition: car.condition,
      brand: car.brand,
      model: car.model,
      year: car.year,
      bodyType: car.bodyType,
      mileage: car.mileage?.toString(),
      fuelType: car.fuelType,
      transmission: car.transmission,
      location: car.location,
      description: car.description,
      images: car.car_images?.map((img) => img.fileUrl) || ['/images/cars/default-car.svg'],
      features: car.features ? car.features.split(',').filter((f) => f.trim()) : [],
      extractedFeatures: car.extractedFeatures
        ? car.extractedFeatures.split(',').filter((f) => f.trim())
        : [],
      interiorFeatures: car.interiorFeatures
        ? car.interiorFeatures.split(',').filter((f) => f.trim())
        : [],
      exteriorFeatures: car.exteriorFeatures
        ? car.exteriorFeatures.split(',').filter((f) => f.trim())
        : [],
      technicalFeatures: car.technicalFeatures
        ? car.technicalFeatures.split(',').filter((f) => f.trim())
        : [],
      showroomId: car.showroomId,
      user: car.users,
      seller: car.users,
      contactPhone: car.contactPhone,
      color: car.color,
      interiorColor: car.interiorColor,
      engineSize: car.engineSize,
      seatCount: car.seatCount,
      regionalSpecs: car.regionalSpecs,
      vehicleType: car.vehicleType,
      manufacturingCountry: car.manufacturingCountry,
      customsStatus: car.customsStatus,
      licenseStatus: car.licenseStatus,
      insuranceStatus: car.insuranceStatus,
      paymentMethod: car.paymentMethod,
      chassisNumber: car.chassisNumber,
      engineNumber: car.engineNumber,
      locationLat: car.locationLat,
      locationLng: car.locationLng,
      locationAddress: car.locationAddress,
      originalPrice: car.originalPrice?.toString(),
      views: car.views || 0,
      createdAt: car.createdAt,
      updatedAt: car.updatedAt,
    };

    console.log('تم بنجاح إرسال البيانات الحقيقية');
    res.status(200).json(formattedCar);
  } catch (error) {
    console.error('فشل Error fetching vehicle details:', error);
    console.error('فشل Error message:', error.message);
    console.error('فشل Error stack:', error.stack);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
