// @ts-nocheck
/**
 * 🗺️ نظام الخرائط الموحد
 * يدير جميع عمليات الخرائط والمواقع
 */


interface MapConfig {
  provider: 'leaflet' | 'google' | 'mapbox';
  apiKey?: string;
  defaultCenter: [number, number];
  defaultZoom: number;
}

interface Location {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  region?: string;
}

interface GeocodingResult {
  success: boolean;
  location?: Location;
  error?: string;
}

interface DistanceResult {
  success: boolean;
  distance?: number; // in kilometers
  duration?: number; // in minutes
  error?: string;
}

// Libyan cities coordinates
const LIBYAN_CITIES: Record<string, [number, number]> = {
  'طرابلس': [32.8872, 13.1913],
  'بنغازي': [32.1194, 20.0868],
  'مصراتة': [32.3754, 15.0925],
  'البيضاء': [32.7627, 21.7587],
  'الزاوية': [32.7570, 12.7270],
  'طبرق': [32.0768, 23.9764],
  'سبها': [27.0377, 14.4279],
  'زليتن': [32.4674, 14.5687],
  'أجدابيا': [30.7554, 20.2253],
  'درنة': [32.7552, 22.6377]
};

export class MapsManager {
  private config: MapConfig;

  constructor() {
    this.config = {
      provider: (process.env.MAPS_PROVIDER || 'leaflet') as any,
      apiKey: process.env.MAPS_API_KEY,
      defaultCenter: [32.8872, 13.1913], // Tripoli
      defaultZoom: 12
    };
  }

  /**
   * Get map configuration for frontend
   */
  getMapConfig() {
    return {
      provider: this.config.provider,
      apiKey: this.config.apiKey,
      defaultCenter: this.config.defaultCenter,
      defaultZoom: this.config.defaultZoom,
      tiles: this.getTileUrl(),
      attribution: this.getAttribution()
    };
  }

  /**
   * Get tile URL based on provider
   */
  private getTileUrl(): string {
    switch (this.config.provider) {
      case 'mapbox':
        return `https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${this.config.apiKey}`;
      case 'google':
        return ''; // Google Maps uses its own SDK
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  }

  /**
   * Get attribution text
   */
  private getAttribution(): string {
    switch (this.config.provider) {
      case 'mapbox':
        return '© Mapbox © OpenStreetMap';
      case 'google':
        return '© Google Maps';
      default:
        return '© OpenStreetMap contributors';
    }
  }

  /**
   * Geocode address to coordinates
   */
  async geocode(address: string, city?: string): Promise<GeocodingResult> {
    try {
      // Check if it's a known Libyan city
      const cityName = city || address;
      const knownCity = Object.keys(LIBYAN_CITIES).find(c =>
        cityName.includes(c) || c.includes(cityName)
      );

      if (knownCity) {
        return {
          success: true,
          location: {
            lat: LIBYAN_CITIES[knownCity][0],
            lng: LIBYAN_CITIES[knownCity][1],
            address,
            city: knownCity,
            region: 'ليبيا'
          }
        };
      }

      // If using external service
      if (this.config.provider === 'google' && this.config.apiKey) {
        return await this.geocodeWithGoogle(address);
      }

      // Default to Tripoli if unknown
      return {
        success: true,
        location: {
          lat: this.config.defaultCenter[0],
          lng: this.config.defaultCenter[1],
          address,
          city: 'طرابلس',
          region: 'ليبيا'
        }
      };
    } catch (error: any) {
      console.error('[MapsManager] Geocoding error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    try {
      // Find nearest Libyan city
      let nearestCity = '';
      let minDistance = Infinity;

      for (const [city, coords] of Object.entries(LIBYAN_CITIES)) {
        const distance = this.calculateDistance(lat, lng, coords[0], coords[1]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCity = city;
        }
      }

      return {
        success: true,
        location: {
          lat,
          lng,
          city: nearestCity,
          region: 'ليبيا',
          address: `${nearestCity}, ليبيا`
        }
      };
    } catch (error: any) {
      console.error('[MapsManager] Reverse geocoding error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get distance and duration between two locations
   */
  async getDistance(from: Location, to: Location): Promise<DistanceResult> {
    try {
      const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng);

      // Estimate duration (assuming 60 km/h average speed)
      const duration = (distance / 60) * 60; // in minutes

      return {
        success: true,
        distance: Math.round(distance * 10) / 10,
        duration: Math.round(duration)
      };
    } catch (error: any) {
      console.error('[MapsManager] Distance calculation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(lat: number, lng: number): boolean {
    // Check if coordinates are within Libya's bounds
    return lat >= 19.5 && lat <= 33.2 && lng >= 9.3 && lng <= 25.2;
  }

  /**
   * Get nearby locations
   */
  async getNearbyLocations(lat: number, lng: number, radius: number = 50): Promise<any[]> {
    try {
      const nearby = [];

      for (const [city, coords] of Object.entries(LIBYAN_CITIES)) {
        const distance = this.calculateDistance(lat, lng, coords[0], coords[1]);
        if (distance <= radius) {
          nearby.push({
            city,
            distance: Math.round(distance * 10) / 10,
            coordinates: coords
          });
        }
      }

      return nearby.sort((a, b) => a.distance - b.distance);
    } catch (error: any) {
      console.error('[MapsManager] Get nearby locations error:', error);
      return [];
    }
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Geocode with Google Maps API
   */
  private async geocodeWithGoogle(address: string): Promise<GeocodingResult> {
    // Implementation would require actual Google Maps API
    // This is a placeholder
    return {
      success: false,
      error: 'Google Maps geocoding not implemented'
    };
  }

  /**
   * Generate static map URL
   */
  getStaticMapUrl(lat: number, lng: number, zoom: number = 15, size: string = '600x400'): string {
    switch (this.config.provider) {
      case 'google':
        return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&key=${this.config.apiKey}`;
      case 'mapbox':
        return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${lng},${lat},${zoom}/${size}?access_token=${this.config.apiKey}`;
      default:
        return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size}`;
    }
  }

  /**
   * Get all Libyan cities
   */
  getLibyanCities(): string[] {
    return Object.keys(LIBYAN_CITIES);
  }

  /**
   * Get city coordinates
   */
  getCityCoordinates(city: string): [number, number] | null {
    return LIBYAN_CITIES[city] || null;
  }
}

// Singleton instance
let mapsManager: MapsManager;

export function getMapsManager(): MapsManager {
  if (!mapsManager) {
    mapsManager = new MapsManager();
  }
  return mapsManager;
}

export default getMapsManager();
