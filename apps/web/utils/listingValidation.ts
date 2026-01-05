/**
 * نظام التحقق من صحة بيانات الإعلانات
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string> | undefined;
}

export interface CarListingData {
  title?: string;
  brand: string;
  model: string;
  year: string;
  condition: string;
  mileage: string;
  price: string;
  city: string;
  contactPhone: string;
  description: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  regionalSpec: string;
  exteriorColor: string;
  interiorColor: string;
  seatCount: string;
  chassisNumber?: string;
  engineNumber?: string;
  engineSize?: string;
  listingType: 'auction' | 'instant';
  auctionStartTime?: 'now' | 'after_30_seconds' | 'after_1_hour' | 'after_24_hours' | 'custom';
  auctionCustomStartTime?: string;
  auctionDuration?: '1_minute' | '1_day' | '3_days' | '1_week' | '1_month';
}

/**
 * التحقق من صحة بيانات إنشاء الإعلان
 */
export function validateCarListingData(data: Partial<CarListingData>): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // الحقول المطلوبة
  const requiredFields = [
    'brand',
    'model',
    'year',
    'price',
    'contactPhone',
    'condition',
    'city',
    'listingType',
  ];

  const arabicFieldNames: Record<string, string> = {
    brand: 'ماركة السيارة',
    model: 'موديل السيارة',
    year: 'سنة الصنع',
    price: 'السعر',
    contactPhone: 'رقم الهاتف',
    condition: 'حالة السيارة',
    city: 'المدينة',
    listingType: 'نوع الإعلان',
  };

  // التحقق من الحقول المطلوبة
  for (const field of requiredFields) {
    if (
      !data[field as keyof CarListingData] ||
      String(data[field as keyof CarListingData]).trim() === ''
    ) {
      errors[field] = `${arabicFieldNames[field]} مطلوب`;
    }
  }

  // التحقق من سنة الصنع
  if (data.year) {
    const year = parseInt(data.year);
    const currentYear = new Date().getFullYear();

    if (isNaN(year)) {
      errors.year = 'سنة الصنع يجب أن تكون رقماً';
    } else if (year < 1990 || year > currentYear + 1) {
      errors.year = `سنة الصنع يجب أن تكون بين 1990 و ${currentYear + 1}`;
    }
  }

  // التحقق من السعر
  if (data.price) {
    const price = parseFloat(data.price);

    if (isNaN(price)) {
      errors.price = 'السعر يجب أن يكون رقماً';
    } else if (price <= 0) {
      errors.price = 'السعر يجب أن يكون أكبر من صفر';
    }
  }

  // التحقق من المسافة المقطوعة
  if (data.mileage && data.mileage.trim() !== '') {
    const mileage = parseInt(data.mileage);

    if (isNaN(mileage)) {
      errors.mileage = 'المسافة المقطوعة يجب أن تكون رقماً';
    } else if (mileage < 0) {
      errors.mileage = 'المسافة المقطوعة لا يمكن أن تكون سالبة';
    }
  }

  // التحقق من رقم الهاتف
  if (data.contactPhone) {
    const phoneRegex = /^(\+?218|0)?[1-9]\d{8}$/;
    if (!phoneRegex.test(data.contactPhone.replace(/\s+/g, ''))) {
      errors.contactPhone = 'رقم الهاتف غير صحيح';
    }
  }

  // التحقق من بيانات المزاد
  if (data.listingType === 'auction') {
    if (data.auctionStartTime === 'custom' && !data.auctionCustomStartTime) {
      errors.auctionCustomStartTime = 'يجب تحديد وقت بداية المزاد المخصص';
    }

    if (data.auctionCustomStartTime) {
      const customTime = new Date(data.auctionCustomStartTime);
      const now = new Date();

      if (customTime <= now) {
        errors.auctionCustomStartTime = 'وقت بداية المزاد يجب أن يكون في المستقبل';
      }
    }
  }

  // تحذيرات
  if (!data.description || data.description.trim().length < 20) {
    warnings.description = 'وصف أطول يحسن من جودة الإعلان';
  }

  if (!data.title || data.title.trim() === '') {
    warnings.title = 'عنوان مخصص يجعل الإعلان أكثر جاذبية';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

/**
 * التحقق من صحة الصور
 */
export function validateImages(images: any[]): ValidationResult {
  const errors: Record<string, string> = {};

  if (!images || !Array.isArray(images) || images.length === 0) {
    errors.images = 'يجب إضافة صورة واحدة على الأقل للسيارة';
  } else {
    // التحقق من كل صورة
    images.forEach((image, index) => {
      if (!image.url || !image.url.trim()) {
        errors[`image_${index}`] = `رابط الصورة ${index + 1} مفقود`;
      }
    });

    // التحقق من الحد الأقصى للصور
    if (images.length > 10) {
      errors.images = 'لا يمكن إضافة أكثر من 10 صور';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * تنظيف وتطهير بيانات الإعلان
 */
export function sanitizeCarListingData(data: Partial<CarListingData>): Partial<CarListingData> {
  const sanitized: Partial<CarListingData> = {};

  // تنظيف النصوص
  (Object.keys(data) as Array<keyof CarListingData>).forEach((key) => {
    const value = data[key];

    if (typeof value === 'string') {
      // إزالة المسافات الزائدة
      (sanitized as any)[key] = value.trim();
    } else {
      (sanitized as any)[key] = value;
    }
  });

  // تنظيف رقم الهاتف
  if (sanitized.contactPhone) {
    sanitized.contactPhone = sanitized.contactPhone.replace(/\s+/g, '').replace(/-/g, '');
  }

  // تنظيف السعر والمسافة
  if (sanitized.price) {
    sanitized.price = sanitized.price.replace(/[^\d.]/g, '');
  }

  if (sanitized.mileage) {
    sanitized.mileage = sanitized.mileage.replace(/[^\d]/g, '');
  }

  return sanitized;
}
