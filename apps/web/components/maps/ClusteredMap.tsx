import { Bounds, Cluster, MapPoint, SmartClusterManager } from '@/utils/map-clustering';
import { MapControlButton } from '@sooq-mazad/ui';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ClusteredMapProps {
  points: MapPoint[];
  onPointClick?: (point: MapPoint) => void;
  onClusterClick?: (cluster: Cluster) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  showControls?: boolean;
  minZoom?: number;
  maxZoom?: number;
  renderPopup?: (point: MapPoint) => string;
}

export function ClusteredMap({
  points,
  onPointClick,
  onClusterClick,
  center = [32.8872, 13.1913], // طرابلس، ليبيا
  zoom = 6,
  height = '500px',
  className = '',
  showControls = true,
  minZoom = 5,
  maxZoom = 18,
  renderPopup,
}: ClusteredMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [currentBounds, setCurrentBounds] = useState<Bounds | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // مدير الـ clustering
  const clusterManager = useMemo(() => new SmartClusterManager(60), []);

  // حساب الـ clusters
  const clusters = useMemo(() => {
    if (!currentBounds) return [];
    return clusterManager.clusterPoints(points, currentZoom, currentBounds);
  }, [points, currentZoom, currentBounds, clusterManager]);

  // تهيئة الخريطة
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // إنشاء الخريطة
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      minZoom,
      maxZoom,
      zoomControl: showControls,
    });

    // إضافة طبقة الخريطة
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
    setIsLoading(false);

    // تحديث الحدود الحالية
    const bounds = map.getBounds();
    setCurrentBounds({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });

    // معالجات الأحداث
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    map.on('moveend', () => {
      const bounds = map.getBounds();
      setCurrentBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    });

    // تنظيف
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, minZoom, maxZoom, showControls]);

  // تحديث Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // إزالة جميع الـ markers القديمة
    markersRef.current.forEach((marker) => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // إضافة markers جديدة
    clusters.forEach((cluster) => {
      if (!mapRef.current) return;

      if (cluster.count === 1) {
        // نقطة واحدة - عرض marker عادي
        const point = cluster.points[0];

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
              </svg>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([point.lat, point.lng], { icon }).addTo(mapRef.current);

        // إضافة popup
        if (renderPopup) {
          marker.bindPopup(renderPopup(point));
        }

        // معالج النقر
        marker.on('click', () => {
          if (onPointClick) {
            onPointClick(point);
          }
        });

        markersRef.current.push(marker);
      } else {
        // cluster - عرض دائرة مع عدد النقاط
        const size = Math.min(60, 30 + Math.log(cluster.count) * 10);

        const icon = L.divIcon({
          className: 'custom-cluster',
          html: `
            <div class="flex items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform hover:scale-110 cursor-pointer" style="width: ${size}px; height: ${size}px;">
              <span class="font-bold text-sm">${cluster.count}</span>
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([cluster.lat, cluster.lng], { icon }).addTo(mapRef.current);

        // معالج النقر على الـ cluster
        marker.on('click', () => {
          if (onClusterClick) {
            onClusterClick(cluster);
          } else if (mapRef.current) {
            // تكبير إلى الـ cluster
            mapRef.current.setView([cluster.lat, cluster.lng], currentZoom + 2);
          }
        });

        markersRef.current.push(marker);
      }
    });
  }, [clusters, currentZoom, onPointClick, onClusterClick, renderPopup]);

  // زر إعادة التوسيط
  const recenterMap = useCallback(() => {
    if (!mapRef.current || points.length === 0) return;

    if (points.length === 1) {
      mapRef.current.setView([points[0].lat, points[0].lng], 12);
    } else {
      // حساب الحدود لجميع النقاط
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points]);

  // زر التحديث
  const refreshClusters = useCallback(() => {
    clusterManager.clearCache();
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      setCurrentBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    }
  }, [clusterManager]);

  return (
    <div className={`relative ${className}`}>
      {/* الخريطة */}
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="rounded-lg shadow-md"
      />

      {/* مؤشر تحميل موحد */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/90">
          <div
            className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
            style={{ width: 32, height: 32 }}
            role="status"
            aria-label="جاري تحميل الخريطة"
          />
        </div>
      )}

      {/* أدوات التحكم */}
      {!isLoading && showControls && (
        <div className="absolute left-4 top-4 z-[1000] flex flex-col gap-2">
          {/* عدد النقاط */}
          <div className="rounded-lg bg-white px-3 py-2 shadow-md">
            <div className="text-xs text-gray-600">إجمالي النقاط</div>
            <div className="text-lg font-bold text-gray-900">{points.length}</div>
          </div>

          {/* عدد الـ clusters */}
          <div className="rounded-lg bg-white px-3 py-2 shadow-md">
            <div className="text-xs text-gray-600">المجموعات</div>
            <div className="text-lg font-bold text-blue-600">{clusters.length}</div>
          </div>

          {/* زر إعادة التوسيط */}
          <MapControlButton
            onClick={recenterMap}
            label="إعادة التوسيط"
            unstyled
            className="rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
          >
            <svg
              className="h-5 w-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
          </MapControlButton>

          {/* زر التحديث */}
          <MapControlButton
            onClick={refreshClusters}
            label="تحديث"
            unstyled
            className="rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
          >
            <svg
              className="h-5 w-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </MapControlButton>
        </div>
      )}

      {/* مستوى التكبير */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-lg bg-white px-3 py-2 text-sm shadow-md">
          <span className="text-gray-600">التكبير:</span>{' '}
          <span className="font-semibold text-gray-900">{currentZoom}</span>
        </div>
      )}
    </div>
  );
}

export default ClusteredMap;
