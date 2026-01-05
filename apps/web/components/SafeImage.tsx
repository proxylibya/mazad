import React, { useEffect, useRef, useState } from 'react';

interface SafeImageProps {
  src: string | Array<string | { url?: string }>;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onError?: (error: Event) => void;
  onLoad?: (event: Event) => void;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
}

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/placeholder.svg',
  onError,
  onLoad,
  style,
  loading = 'lazy',
}) => {
  // احسب مصدر الصورة الآمن مبدئياً لتفادي render أولي بصsrc فارغ
  const computeInitialSrc = (
    source: string | Array<string | { url?: string }>,
    fallback: string,
  ): string => {
    try {
      if (Array.isArray(source)) {
        const valid = source.find((img: any) => {
          const url = typeof img === 'string' ? img.trim() : img?.url?.trim?.() || '';
          return (
            url &&
            !url.includes('blob:') &&
            !url.includes('data:') &&
            (url.startsWith('http') || url.startsWith('/') || url.startsWith('./'))
          );
        });
        if (valid) {
          return typeof valid === 'string' ? valid : valid.url;
        }
        return fallback;
      }
      if (typeof source === 'string' && source.trim() && !source.includes('blob:')) {
        return source.trim();
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const initialSrc = computeInitialSrc(src, fallbackSrc);
  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(initialSrc.startsWith('http'));
  const loadTimeoutRef = useRef<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // تحويل src إلى string واحد
  const getSrcString = (source: string | Array<string | { url?: string }>): string => {
    if (Array.isArray(source)) {
      // أخذ أول صورة صالحة من المصفوفة - التعامل مع النصوص والكائنات
      const validImage = source.find((img) => {
        let imageUrl = '';

        if (typeof img === 'string') {
          imageUrl = img.trim();
        } else if (img && typeof img === 'object' && img.url) {
          imageUrl = img.url;
        }

        return (
          imageUrl &&
          !imageUrl.includes('blob:') && // تجنب blob URLs
          !imageUrl.includes('data:') && // تجنب data URLs إذا لزم الأمر
          (imageUrl.startsWith('http') || imageUrl.startsWith('/') || imageUrl.startsWith('./'))
        );
      });

      // استخراج URL من الصورة الصالحة
      if (validImage) {
        if (typeof validImage === 'string') {
          return validImage;
        } else if (validImage && typeof validImage === 'object' && validImage.url) {
          return validImage.url;
        }
      }

      console.warn('[SafeImage] لم يتم العثور على صورة صالحة في المصفوفة:', source);
      return fallbackSrc;
    }

    if (typeof source === 'string' && source.trim()) {
      // التحقق من أن الصورة ليست blob URL
      if (source.includes('blob:')) {
        console.warn('[SafeImage] تم تجاهل blob URL:', source);
        return fallbackSrc;
      }
      return source;
    }

    console.warn('[SafeImage] مصدر الصورة غير صالح:', source);
    return fallbackSrc;
  };

  useEffect(() => {
    const safeSrc = getSrcString(src);
    setCurrentSrc(safeSrc);
    setHasError(false);
    setIsLoading(safeSrc.startsWith('http'));
    setRetryCount(0); // إعادة تعيين عداد المحاولات عند تغيير المصدر

    // إضافة timeout للصور الخارجية لتجنب التحميل الطويل
    if (safeSrc.startsWith('http')) {
      // Clear any previous timeout before setting a new one
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      loadTimeoutRef.current = window.setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[SafeImage] انتهت مهلة تحميل الصورة: ${safeSrc}`);
        }
        if (!hasError && currentSrc === safeSrc) {
          setHasError(true);
          setCurrentSrc(fallbackSrc);
          setIsLoading(false);
        }
      }, 15000); // 15 ثانية timeout للصور الخارجية (زيادة المهلة)
    }

    // تنظيف timeout السابق
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [src, fallbackSrc]);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // تقليل التحذيرات في وحدة التحكم للصور المفقودة المتوقعة
    if (
      process.env.NODE_ENV === 'development' &&
      !currentSrc.includes('placeholder.svg') &&
      !currentSrc.includes('elantra1.jpg') &&
      !currentSrc.includes('default-car.svg')
    ) {
      console.warn(`[SafeImage] فشل تحميل الصورة (محاولة ${retryCount + 1}): ${currentSrc}`);
    }

    // إعادة المحاولة للصور الخارجية مرة واحدة فقط
    if (currentSrc.startsWith('http') && retryCount === 0 && !hasError) {
      if (process.env.NODE_ENV === 'development') {
      }
      setRetryCount(1);
      setIsLoading(true);
      // إعادة تعيين الصورة لإجبار إعادة التحميل
      const img = event.target as HTMLImageElement;
      img.src = currentSrc + '?retry=1';
      return;
    }

    if (!hasError && currentSrc !== fallbackSrc) {
      if (process.env.NODE_ENV === 'development') {
      }
      setHasError(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
      setRetryCount(0); // إعادة تعيين عداد المحاولات
    } else if (hasError && currentSrc === fallbackSrc) {
      // إذا فشلت الصورة البديلة أيضاً، استخدم placeholder عام
      if (process.env.NODE_ENV === 'development') {
        console.error(`[SafeImage] فشلت الصورة البديلة أيضاً: ${fallbackSrc}`);
      }
      setCurrentSrc('/placeholder.svg');
    } else if (currentSrc === '/placeholder.svg') {
      // إذا فشل حتى placeholder، استخدم صورة افتراضية مدمجة
      if (process.env.NODE_ENV === 'development') {
        console.error(`[SafeImage] فشل حتى placeholder العام`);
      }
      setCurrentSrc(
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmM2Y0ZjYiLz48cmVjdCB4PSIxNTAiIHk9IjEwMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI4IiBmaWxsPSIjZDFkNWRiIi8+PHBhdGggZD0iTTE3NSAxMjVMMTc1IDEzNU0xNzUgMTM1TDE4NSAxNDVNMTc1IDEzNUwxNjUgMTQ1TTIyNSAxMjVWMTc1TTIwMCAxNTBIMjUwIiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHRleHQgeD0iMjAwIiB5PSIyMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZGlyPSJydGwiPtis2KfYsdmKINin2YTYqtit2YXZitmELi4uPC90ZXh0Pjwvc3ZnPg==',
      );
    }

    if (onError) {
      onError(event.nativeEvent);
    }
  };

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setHasError(false);

    // إلغاء timeout عند نجاح التحميل
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    if (onLoad) {
      onLoad(event.nativeEvent);
    }
  };

  // عرض placeholder أثناء التحميل - مع تحسين للصور الخارجية
  if (isLoading && currentSrc !== fallbackSrc && currentSrc.startsWith('http')) {
    return (
      <div
        className={`relative flex animate-pulse items-center justify-center bg-gray-200 ${className}`}
        style={style}
      >
        <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
        {/* إضافة نص تحميل للصور الخارجية */}
        <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-xs text-white">
          جاري التحميل...
        </div>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      style={{
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        ...style,
      }}
      loading={loading}
      onError={handleError}
      onLoad={handleLoad}
      crossOrigin={currentSrc.startsWith('http') ? 'anonymous' : undefined} // CORS فقط للصور الخارجية
      referrerPolicy="no-referrer" // تحسين الخصوصية
    />
  );
};

export default SafeImage;
