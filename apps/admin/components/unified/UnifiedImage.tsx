/**
 * 🖼️ مكون الصور الموحد
 * Unified Image Component
 *
 * يعرض الصور بشكل موحد مع دعم:
 * - Fallback تلقائي
 * - Loading states
 * - أحجام متعددة
 * - عرض عدد الصور
 */

import {
  BuildingStorefrontIcon,
  CubeIcon,
  PhotoIcon,
  TruckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import {
  IMAGE_ROUNDED,
  IMAGE_SIZES,
  getAllEntityImages,
  getEntityImage,
  getImageUrl,
  parseImages,
  type ImageConfig,
  type ImageableEntity,
} from '../../lib/unified-admin-system';

// أيقونات الـ Fallback حسب النوع
const FALLBACK_ICONS = {
  user: UserCircleIcon,
  car: PhotoIcon,
  truck: TruckIcon,
  building: BuildingStorefrontIcon,
  image: PhotoIcon,
  package: CubeIcon,
};

interface UnifiedImageProps {
  /** مصدر الصورة - يمكن أن يكون string أو entity يحتوي على صور */
  src?: string | ImageableEntity | null;
  /** النص البديل */
  alt?: string;
  /** إعدادات الصورة */
  config?: ImageConfig;
  /** عرض عدد الصور الإضافية */
  showExtraCount?: number;
  /** Class إضافية */
  className?: string;
  /** onClick handler */
  onClick?: () => void;
}

export default function UnifiedImage({
  src,
  alt = 'صورة',
  config = {},
  showExtraCount,
  className = '',
  onClick,
}: UnifiedImageProps) {
  const { fallbackIcon = 'image', size = 'md', rounded = 'lg', showCount = false } = config;

  const [useProxy, setUseProxy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  // تحديد مصدر الصورة
  let imageSrc: string | null = null;
  let totalImages = 0;

  if (typeof src === 'string') {
    imageSrc = src;
    totalImages = 1;
  } else if (src && typeof src === 'object') {
    imageSrc = getEntityImage(src as ImageableEntity);
    totalImages = getAllEntityImages(src as ImageableEntity).length;
  }

  // إعادة تعيين الحالة عند تغيير المصدر
  useEffect(() => {
    setUseProxy(false);
    setHasError(false);
    setLoading(true);
  }, [imageSrc]);

  const fullUrl = getImageUrl(imageSrc, useProxy);
  const FallbackIcon = FALLBACK_ICONS[fallbackIcon];
  const sizeClass = IMAGE_SIZES[size];
  const roundedClass = IMAGE_ROUNDED[rounded];

  // عرض أيقونة الـ Fallback
  if (hasError || !imageSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-700 ${sizeClass} ${roundedClass} ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <FallbackIcon className="h-1/2 w-1/2 text-slate-500" />
      </div>
    );
  }

  const extraCount = showExtraCount ?? (showCount && totalImages > 1 ? totalImages - 1 : 0);

  return (
    <div
      className={`relative overflow-hidden ${sizeClass} ${roundedClass} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* الصورة */}
      <img
        src={fullUrl}
        alt={alt}
        className={`h-full w-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          if (!useProxy) {
            setUseProxy(true);
            setLoading(true);
          } else {
            setHasError(true);
            setLoading(false);
          }
        }}
      />

      {/* عداد الصور الإضافية */}
      {extraCount > 0 && (
        <span
          className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/70 px-1 text-[10px] font-semibold text-white"
          dir="ltr"
        >
          {extraCount}+
        </span>
      )}
    </div>
  );
}

// ================== مكون معرض الصور ==================

interface ImageGalleryProps {
  images: string[] | string | null | undefined;
  maxDisplay?: number;
  size?: ImageConfig['size'];
  rounded?: ImageConfig['rounded'];
  onImageClick?: (index: number) => void;
}

export function ImageGallery({
  images,
  maxDisplay = 4,
  size = 'md',
  rounded = 'lg',
  onImageClick,
}: ImageGalleryProps) {
  const imageArray = parseImages(images);

  if (imageArray.length === 0) {
    return <UnifiedImage src={null} config={{ fallbackIcon: 'image', size, rounded }} />;
  }

  const displayImages = imageArray.slice(0, maxDisplay);
  const extraCount = imageArray.length - maxDisplay;

  return (
    <div className="flex gap-1">
      {displayImages.map((img, index) => (
        <UnifiedImage
          key={index}
          src={img}
          config={{ size: 'sm', rounded }}
          showExtraCount={
            index === displayImages.length - 1 && extraCount > 0 ? extraCount : undefined
          }
          onClick={() => onImageClick?.(index)}
        />
      ))}
    </div>
  );
}

// ================== مكون صورة المستخدم ==================

interface UserAvatarProps {
  user: {
    name?: string | null;
    profileImage?: string | null;
    avatar?: string | null;
    image?: string | null;
  };
  size?: ImageConfig['size'];
  showName?: boolean;
  showVerified?: boolean;
  verified?: boolean;
}

export function UserAvatar({
  user,
  size = 'sm',
  showName = true,
  showVerified = false,
  verified = false,
}: UserAvatarProps) {
  const imageSrc = user.profileImage || user.avatar || user.image;
  const initial = user.name?.charAt(0) || '?';

  return (
    <div className="flex items-center gap-3">
      {imageSrc ? (
        <UnifiedImage
          src={imageSrc}
          alt={user.name || 'مستخدم'}
          config={{ fallbackIcon: 'user', size, rounded: 'full' }}
        />
      ) : (
        <div
          className={`flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 ${IMAGE_SIZES[size]}`}
        >
          <span className="text-sm font-semibold text-white">{initial}</span>
        </div>
      )}

      {showName && (
        <div>
          <p className="font-medium text-white">{user.name || 'بدون اسم'}</p>
          {showVerified && verified && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">✓ موثق</span>
          )}
        </div>
      )}
    </div>
  );
}

// ================== مكون صورة المنتج ==================

interface ProductImageProps {
  product: ImageableEntity & { title?: string; name?: string };
  size?: ImageConfig['size'];
  showTitle?: boolean;
}

export function ProductImage({ product, size = 'md', showTitle = true }: ProductImageProps) {
  return (
    <div className="flex items-center gap-3">
      <UnifiedImage
        src={product}
        alt={product.title || product.name || 'منتج'}
        config={{ fallbackIcon: 'car', size, rounded: 'lg' }}
        showExtraCount={parseImages(product.images).length - 1 || undefined}
      />

      {showTitle && (
        <div>
          <p className="font-medium text-white">{product.title || product.name || 'بدون عنوان'}</p>
        </div>
      )}
    </div>
  );
}
