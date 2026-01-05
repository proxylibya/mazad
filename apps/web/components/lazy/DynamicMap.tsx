/**
 * Dynamic Map Component - تحميل كسول للخرائط
 * يستخدم next/dynamic لتأخير تحميل مكتبة Leaflet الثقيلة
 */

import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import dynamic from 'next/dynamic';

// Loading component للخرائط
const MapLoadingFallback = ({ height = '200px' }: { height?: string }) => (
  <div
    className="flex items-center justify-center rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100"
    style={{ height }}
  >
    <div className="text-center">
      <MapPinIcon className="mx-auto mb-2 h-8 w-8 animate-bounce text-blue-600" />
      <p className="text-sm font-medium text-blue-800">جاري تحميل الخريطة...</p>
      <div className="mt-2 flex justify-center space-x-1">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600 delay-75"></div>
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600 delay-150"></div>
      </div>
    </div>
  </div>
);

// Dynamic import لـ SafeLeafletMap
export const DynamicSafeLeafletMap = dynamic<any>(() => import('../maps/SafeLeafletMap'), {
  loading: () => <MapLoadingFallback />,
  ssr: false, // الخرائط لا تحتاج SSR
});

// Dynamic import لـ InteractiveMap
export const DynamicInteractiveMap = dynamic<any>(() => import('../common/maps/InteractiveMap'), {
  loading: () => <MapLoadingFallback height="400px" />,
  ssr: false,
});

// Dynamic import لـ MarketplaceMapView
export const DynamicMarketplaceMapView = dynamic<any>(() => import('../maps/MarketplaceMapView'), {
  loading: () => <MapLoadingFallback height="500px" />,
  ssr: false,
});

// Dynamic import لـ SimpleMap
export const DynamicSimpleMap = dynamic<any>(() => import('../common/maps/SimpleMap'), {
  loading: () => <MapLoadingFallback height="300px" />,
  ssr: false,
});

// مكون wrapper عام للخرائط
interface DynamicMapProps {
  type?: 'safe' | 'interactive' | 'marketplace' | 'simple';
  latitude: number;
  longitude: number;
  address?: string;
  height?: string;
  zoom?: number;
  showMarker?: boolean;
  className?: string;
  [key: string]: any;
}

export const DynamicMap = ({ type = 'safe', ...props }: DynamicMapProps) => {
  switch (type) {
    case 'interactive':
      return <DynamicInteractiveMap {...props} />;
    case 'marketplace':
      return <DynamicMarketplaceMapView {...props} />;
    case 'simple':
      return <DynamicSimpleMap {...props} />;
    case 'safe':
    default:
      return <DynamicSafeLeafletMap {...props} />;
  }
};

export default DynamicMap;
