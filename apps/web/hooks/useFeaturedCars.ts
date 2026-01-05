import { useEffect, useState } from 'react';

interface Car {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  images: string[];
  location: string;
  condition: string;
  seller: {
    id: string;
    name: string;
    verified: boolean;
  };
}

interface Auction {
  id: string;
  title: string;
  currentPrice: number;
  endTime: string;
  car: Car;
}

interface FeaturedData {
  cars: Car[];
  auctions: Auction[];
}

interface UseFeaturedCarsReturn {
  data: FeaturedData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useFeaturedCars = (): UseFeaturedCarsReturn => {
  const [data, setData] = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeaturedData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/featured/simple');

      if (!response.ok) {
        throw new Error('خطأ في جلب البيانات المميزة');
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'فشل في جلب البيانات المميزة');
      }
    } catch (err) {
      console.error('خطأ في جلب البيانات المميزة:', err);
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');

      // بيانات افتراضية في حالة الخطأ
      setData({
        auctions: [],
        cars: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedData();
  }, []);

  const refetch = () => {
    fetchFeaturedData();
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
};

// دالة مساعدة لتنسيق الصور
export const getCarImageUrl = (images: string | string[]): string => {
  const defaultImage = '/images/placeholder-car.jpg';

  if (!images) return defaultImage;

  // إذا كانت مصفوفة، خذ أول عنصر
  if (Array.isArray(images)) {
    const firstImage = images[0]?.trim();
    if (!firstImage) return defaultImage;

    // تحقق من أن الصورة ليست blob URL
    if (firstImage.includes('blob:')) {
      console.warn('تم تجاهل blob URL في getCarImageUrl:', firstImage);
      return defaultImage;
    }

    // إذا كانت الصورة URL كامل، استخدمها مباشرة
    if (firstImage.startsWith('http')) {
      return firstImage;
    }

    // إذا كانت مسار محلي، أضف البادئة
    if (firstImage.startsWith('/')) {
      return firstImage;
    }

    return defaultImage;
  }

  // إذا كانت نص، قم بتحليلها
  if (typeof images === 'string') {
    try {
      // محاولة تحليل JSON أولاً
      if (images.startsWith('[')) {
        const parsedImages = JSON.parse(images);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          return getCarImageUrl(parsedImages);
        }
      }
    } catch (error) {
      // في حالة فشل تحليل JSON، استخدم الطريقة التقليدية
    }

    // معالجة الصور المفصولة بفواصل
    const imageArray = images.split(',');
    const firstImage = imageArray[0]?.trim();

    if (!firstImage) return defaultImage;

    // تحقق من أن الصورة ليست blob URL
    if (firstImage.includes('blob:')) {
      console.warn('تم تجاهل blob URL في getCarImageUrl:', firstImage);
      return defaultImage;
    }

    // إذا كانت الصورة URL كامل، استخدمها مباشرة
    if (firstImage.startsWith('http')) {
      return firstImage;
    }

    // إذا كانت مسار محلي، أضف البادئة
    if (firstImage.startsWith('/')) {
      return firstImage;
    }
  }

  // استخدم صورة افتراضية
  return defaultImage;
};

// دالة مساعدة لحساب الوقت المتبقي للمزاد
export const getTimeRemaining = (endTime: string): string => {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return 'انتهى المزاد';
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} يوم و ${hours} ساعة`;
  } else if (hours > 0) {
    return `${hours} ساعة و ${minutes} دقيقة`;
  } else {
    return `${minutes} دقيقة`;
  }
};

// دالة مساعدة لتنسيق السعر (مُزالة - نستخدم الآن utils/numberFormat)
