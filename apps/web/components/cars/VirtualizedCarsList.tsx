import { InfiniteScrollGrid } from '@/components/virtualized/VirtualizedGrid';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback } from 'react';

interface Car {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  images: string[];
  city: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  status: string;
}

interface VirtualizedCarsListProps {
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  itemsPerRow?: number;
  itemHeight?: number;
  className?: string;
}

export function VirtualizedCarsList({
  filters = {},
  sortBy = 'createdAt',
  sortOrder = 'desc',
  itemsPerRow = 3,
  itemHeight = 350,
  className = '',
}: VirtualizedCarsListProps) {
  // دالة جلب البيانات
  const fetchCars = useCallback(
    async (page: number, pageSize: number) => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...filters,
      });

      const response = await fetch(`/api/cars/paginated?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch cars');
      }

      const result = await response.json();

      return {
        data: result.data,
        hasMore: result.hasNextPage,
        total: result.total,
      };
    },
    [filters, sortBy, sortOrder],
  );

  const {
    data: cars,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    total,
  } = useInfiniteScroll<Car>({
    fetchData: fetchCars,
    pageSize: 20,
  });

  // عرض بطاقة السيارة
  const renderCarCard = useCallback((car: Car, index: number) => {
    return (
      <Link href={`/marketplace/${car.id}`} key={car.id}>
        <div className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg">
          {/* صورة السيارة */}
          <div className="relative h-48 w-full overflow-hidden bg-gray-100">
            {car.images && car.images.length > 0 ? (
              <Image
                src={car.images[0]}
                alt={car.title}
                fill
                className="object-cover transition-transform group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </div>
            )}

            {/* شارة الحالة */}
            {car.status === 'FEATURED' && (
              <div className="absolute left-2 top-2 rounded bg-yellow-500 px-2 py-1 text-xs font-semibold text-white">
                مميز
              </div>
            )}
          </div>

          {/* تفاصيل السيارة */}
          <div className="p-4">
            <h3 className="mb-2 line-clamp-1 text-lg font-semibold text-gray-900">{car.title}</h3>

            <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
              <span>{car.brand}</span>
              <span>•</span>
              <span>{car.model}</span>
              <span>•</span>
              <span>{car.year}</span>
            </div>

            <div className="mb-3 flex items-center gap-4 text-sm text-gray-500">
              {car.mileage !== undefined && car.mileage !== null && (
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>{car.mileage.toLocaleString()} كم</span>
                </div>
              )}

              {car.fuelType && (
                <div className="flex items-center gap-1">
                  <span>{car.fuelType}</span>
                </div>
              )}

              {car.transmission && (
                <div className="flex items-center gap-1">
                  <span>{car.transmission}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="text-xl font-bold text-blue-600">
                {car.price.toLocaleString()} د.ل
              </div>

              <div className="flex items-center gap-1 text-sm text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{car.city}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }, []);

  return (
    <div className={`h-full ${className}`}>
      {/* عداد النتائج */}
      {total > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          عرض {cars.length} من أصل {total} سيارة
        </div>
      )}

      {/* Grid المحسن */}
      <InfiniteScrollGrid
        items={cars}
        itemHeight={itemHeight}
        itemsPerRow={itemsPerRow}
        gap={16}
        renderItem={renderCarCard}
        loading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        emptyMessage="لا توجد سيارات متاحة"
        className="min-h-screen"
      />
    </div>
  );
}

export default VirtualizedCarsList;
