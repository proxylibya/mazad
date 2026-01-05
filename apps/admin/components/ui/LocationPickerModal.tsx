/**
 * مكون قائمة منبثقة لتحديد الموقع على الخريطة
 * Location Picker Modal Component with Interactive Map
 */
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import MinusIcon from '@heroicons/react/24/outline/MinusIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { MapControlButton } from '@sooq-mazad/ui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedPresence } from '../unified/UnifiedAnimation';

// إحداثيات المدن الليبية الرئيسية
const LIBYAN_CITIES: { [key: string]: { lat: number; lng: number } } = {
  طرابلس: { lat: 32.8872, lng: 13.1913 },
  بنغازي: { lat: 32.1194, lng: 20.0861 },
  مصراتة: { lat: 32.3754, lng: 15.0925 },
  الزاوية: { lat: 32.7571, lng: 12.7278 },
  زليتن: { lat: 32.4674, lng: 14.5687 },
  البيضاء: { lat: 32.7627, lng: 21.7551 },
  طبرق: { lat: 32.0836, lng: 23.9764 },
  سبها: { lat: 27.0377, lng: 14.4283 },
  أجدابيا: { lat: 30.7555, lng: 20.2263 },
  سرت: { lat: 31.2089, lng: 16.5887 },
  الخمس: { lat: 32.6486, lng: 14.2619 },
  درنة: { lat: 32.7673, lng: 22.6367 },
  غريان: { lat: 32.1722, lng: 13.0203 },
  صبراتة: { lat: 32.7922, lng: 12.4842 },
  ترهونة: { lat: 32.435, lng: 13.6332 },
  مرزق: { lat: 25.9155, lng: 13.911 },
  غات: { lat: 24.9646, lng: 10.1728 },
  أوباري: { lat: 26.5901, lng: 12.7576 },
  'براك الشاطئ': { lat: 27.5458, lng: 14.273 },
  المرج: { lat: 32.4933, lng: 20.8333 },
};

// قائمة المدن للبحث السريع
const QUICK_CITIES = ['طرابلس', 'بنغازي', 'مصراتة', 'الزاوية', 'سرت', 'سبها'];

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: LocationData) => void;
  initialLocation?: LocationData;
  title?: string;
}

const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialLocation,
  title = 'تحديد موقع السيارة',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // الموقع الافتراضي: طرابلس
  const defaultLocation = { lat: 32.8872, lng: 13.1913 };

  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>(
    initialLocation
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
      : defaultLocation,
  );
  const [address, setAddress] = useState<string>(initialLocation?.address || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [zoom, setZoom] = useState(14);

  // تحميل Leaflet
  const loadLeaflet = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const L = (window as any).L;
      if (!L) {
        // تحميل CSS
        const existingLink = document.querySelector('link[href*="leaflet"]');
        if (!existingLink) {
          const link = document.createElement('link');
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }

        // تحميل JS
        const existingScript = document.querySelector('script[src*="leaflet"]');
        if (!existingScript) {
          return new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Leaflet'));
            document.head.appendChild(script);
          });
        }
      }
    } catch (error) {
      console.error('Error loading Leaflet:', error);
      throw error;
    }
  }, []);

  // تهيئة الخريطة
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    try {
      // إنشاء الخريطة
      mapRef.current = L.map(mapContainerRef.current, {
        center: [selectedLocation.lat, selectedLocation.lng],
        zoom: zoom,
        zoomControl: false,
      });

      // إضافة طبقة الخريطة
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // إنشاء أيقونة مخصصة
      const customIcon = L.divIcon({
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 14px;
              height: 14px;
              background: #fff;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        className: 'custom-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      // إضافة المؤشر
      markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(mapRef.current);

      // حدث سحب المؤشر
      markerRef.current.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setSelectedLocation({ lat, lng });
        fetchAddress(lat, lng);
      });

      // حدث النقر على الخريطة
      mapRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setSelectedLocation({ lat, lng });
        markerRef.current.setLatLng([lat, lng]);
        fetchAddress(lat, lng);
      });

      // حدث التكبير/التصغير
      mapRef.current.on('zoomend', () => {
        if (mapRef.current) {
          setZoom(mapRef.current.getZoom());
        }
      });

      setIsMapLoaded(true);

      // جلب العنوان للموقع الحالي
      if (selectedLocation.lat && selectedLocation.lng) {
        fetchAddress(selectedLocation.lat, selectedLocation.lng);
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(true);
    }
  }, [selectedLocation.lat, selectedLocation.lng, zoom]);

  // جلب العنوان من الإحداثيات (Reverse Geocoding)
  const fetchAddress = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // البحث عن موقع
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // البحث أولاً في المدن الليبية
      const localResults = Object.entries(LIBYAN_CITIES)
        .filter(([name]) => name.includes(query))
        .map(([name, coords]) => ({
          display_name: name + '، ليبيا',
          lat: coords.lat.toString(),
          lon: coords.lng.toString(),
          isLocal: true,
        }));

      // البحث في Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' ليبيا')}&limit=5&accept-language=ar`,
      );
      const apiResults = await response.json();

      // دمج النتائج مع إعطاء الأولوية للمدن المحلية
      setSearchResults([...localResults, ...apiResults.slice(0, 5 - localResults.length)]);
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // اختيار نتيجة البحث
  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setSelectedLocation({ lat, lng });
    setAddress(result.display_name);
    setSearchResults([]);
    setSearchQuery('');

    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lng], 15);
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  // الانتقال لمدينة
  const goToCity = (cityName: string) => {
    const city = LIBYAN_CITIES[cityName];
    if (city) {
      setSelectedLocation({ lat: city.lat, lng: city.lng });
      if (mapRef.current && markerRef.current) {
        mapRef.current.setView([city.lat, city.lng], 13);
        markerRef.current.setLatLng([city.lat, city.lng]);
      }
      fetchAddress(city.lat, city.lng);
    }
  };

  // تحديد موقعي الحالي
  const getMyLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLocation({ lat: latitude, lng: longitude });

        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }

        fetchAddress(latitude, longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('لم نتمكن من تحديد موقعك. تأكد من تفعيل خدمات الموقع.');
      },
      { enableHighAccuracy: true },
    );
  };

  // التكبير
  const zoomIn = () => {
    if (mapRef.current && zoom < 19) {
      mapRef.current.setZoom(zoom + 1);
    }
  };

  // التصغير
  const zoomOut = () => {
    if (mapRef.current && zoom > 1) {
      mapRef.current.setZoom(zoom - 1);
    }
  };

  // تأكيد الموقع
  const handleConfirm = () => {
    onConfirm({
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      address: address,
    });
    onClose();
  };

  // تحميل الخريطة عند فتح المودال
  useEffect(() => {
    if (isOpen) {
      loadLeaflet()
        .then(() => {
          setTimeout(() => {
            initializeMap();
          }, 100);
        })
        .catch(() => {
          setMapError(true);
        });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setIsMapLoaded(false);
      }
    };
  }, [isOpen, loadLeaflet, initializeMap]);

  // Debounce للبحث
  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocation(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <AnimatedPresence
      show={isOpen}
      variant="fade"
      duration="fast"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      {/* خلفية داكنة */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* المودال */}
      <AnimatedPresence
        show={isOpen}
        className="relative z-10 flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-800 shadow-2xl"
      >
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/20 p-2">
              <MapPinIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-sm text-slate-400">
                انقر على الخريطة أو اسحب المؤشر لتحديد الموقع بدقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* شريط البحث */}
        <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن موقع أو عنوان..."
              className="w-full rounded-xl border border-slate-600 bg-slate-700 py-3 pl-4 pr-12 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {isSearching && (
              <ArrowPathIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-blue-400" />
            )}
          </div>

          {/* نتائج البحث */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-600 bg-slate-700">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-slate-600"
                >
                  <MapPinIcon
                    className={`h-5 w-5 ${result.isLocal ? 'text-green-400' : 'text-slate-400'}`}
                  />
                  <span className="truncate text-sm text-white">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* أزرار المدن السريعة */}
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_CITIES.map((city) => (
              <button
                key={city}
                onClick={() => goToCity(city)}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-600 hover:text-white"
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* الخريطة */}
        <div className="relative min-h-0 flex-1">
          {mapError ? (
            <div className="flex h-full items-center justify-center bg-slate-900">
              <div className="text-center">
                <MapPinIcon className="mx-auto h-16 w-16 text-slate-600" />
                <p className="mt-4 text-slate-400">تعذر تحميل الخريطة</p>
              </div>
            </div>
          ) : (
            <>
              <div
                ref={mapContainerRef}
                className="h-full min-h-[260px] w-full max-[460px]:min-h-[160px] sm:min-h-[300px]"
              />

              {/* أزرار التحكم */}
              <div className="absolute left-4 top-4 z-[1000] flex flex-col gap-2">
                {/* تكبير */}
                <MapControlButton onClick={zoomIn} label="تكبير">
                  <PlusIcon className="h-5 w-5 text-gray-700" />
                </MapControlButton>

                {/* تصغير */}
                <MapControlButton onClick={zoomOut} label="تصغير">
                  <MinusIcon className="h-5 w-5 text-gray-700" />
                </MapControlButton>

                {/* موقعي */}
                <MapControlButton
                  onClick={getMyLocation}
                  label="موقعي الحالي"
                  unstyled
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg transition-all hover:bg-blue-700 active:scale-95"
                >
                  <svg
                    className="h-5 w-5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4m0 12v4m-10-10h4m12 0h4" />
                  </svg>
                </MapControlButton>
              </div>

              {/* مؤشر التحميل */}
              {!isMapLoaded && (
                <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-slate-900/80">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500" />
                    <span className="text-sm text-slate-400">جاري تحميل الخريطة...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* معلومات الموقع المحدد */}
        <div className="border-t border-slate-700 bg-slate-800 px-6 py-4">
          <div className="mb-4 rounded-xl bg-slate-700/50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-500/20 p-2">
                <MapPinIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-300">الموقع المحدد</span>
                  {isLoadingAddress && (
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>
                <p className="text-sm text-white">{address || 'انقر على الخريطة لتحديد الموقع'}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                  <span>خط العرض: {selectedLocation.lat.toFixed(6)}</span>
                  <span>خط الطول: {selectedLocation.lng.toFixed(6)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* أزرار التأكيد */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-600 bg-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-600"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <CheckIcon className="h-5 w-5" />
              تأكيد الموقع
            </button>
          </div>
        </div>
      </AnimatedPresence>
    </AnimatedPresence>
  );
};

export default LocationPickerModal;
