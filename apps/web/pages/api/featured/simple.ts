// API بسيط للسيارات والمزادات المميزة
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // محاولة الاتصال بقاعدة البيانات
    const { PrismaClient } = require('@prisma/client');
    // prisma imported from @/lib/prisma

    // جلب المزادات النشطة (أونلاين فقط - بدون مزادات الساحات)
    const auctions = await prisma.auctions.findMany({
      where: {
        status: 'ACTIVE',
        yardId: null, // ✅ استبعاد مزادات الساحات - تظهر فقط في /yards/[slug]
      },
      include: {
        cars: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    });

    // جلب السيارات المتاحة
    const cars = await prisma.cars.findMany({
      where: {
        status: 'AVAILABLE',
        auctions: {
          none: {}, // استبعاد السيارات التي لها مزادات
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            verified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    });

    // معالجة البيانات
    const processedAuctions = auctions.map((auction) => ({
      id: auction.id,
      title: auction.title,
      currentPrice: auction.currentPrice,
      endTime: auction.endDate,
      car: {
        id: auction.cars?.id,
        title: auction.cars?.title,
        brand: auction.cars?.brand,
        model: auction.cars?.model,
        year: auction.cars?.year,
        location: auction.cars?.location,
        images: auction.cars?.images
          ? auction.cars.images.split(',').filter((img) => img.trim())
          : ['/images/cars/default-car.svg'],
        seller: auction.cars?.users,
      },
    }));

    const processedCars = cars.map((car) => ({
      id: car.id,
      title: car.title,
      brand: car.brand,
      model: car.model,
      year: car.year,
      price: car.price,
      location: car.location,
      images: car.images
        ? car.images.split(',').filter((img) => img.trim())
        : ['/images/cars/default-car.svg'],
      seller: car.users,
    }));

    return res.status(200).json({
      success: true,
      data: {
        auctions: processedAuctions,
        cars: processedCars,
      },
    });
  } catch (error) {
    console.error('خطأ في جلب البيانات المميزة:', error);

    // إرجاع بيانات افتراضية
    return res.status(200).json({
      success: true,
      data: {
        auctions: [],
        cars: [],
      },
      fallback: true,
    });
  }
}
