// @ts-nocheck
/**
 * Public Configuration File
 * Only NEXT_PUBLIC_ environment variables should be exposed to the client
 * All sensitive variables must remain server-side only
 */

// Type-safe public configuration
export interface PublicConfig {
  readonly API_URL: string;
  readonly WS_URL: string;
  readonly SITE_URL: string;
  readonly IS_PRODUCTION: boolean;
  readonly IS_DEVELOPMENT: boolean;
  readonly APP_NAME: string;
  readonly APP_VERSION: string;
  readonly DEFAULT_LOCALE: string;
  readonly SUPPORTED_LOCALES: readonly string[];
  readonly UPLOAD_MAX_SIZE: number;
  readonly UPLOAD_ACCEPTED_FORMATS: readonly string[];
}

// Validate and export public configuration
export const publicConfig: PublicConfig = {
  // API Configuration
  API_URL: (process as any).env.NEXT_PUBLIC_API_URL || '/api',
  WS_URL: (process as any).env.NEXT_PUBLIC_WS_URL || 'http://localhost:3021',
  SITE_URL: (process as any).env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3021',

  // Environment
  IS_PRODUCTION: (process as any).env.NODE_ENV === 'production',
  IS_DEVELOPMENT: (process as any).env.NODE_ENV === 'development',

  // App Info
  APP_NAME: 'سوق مزاد ليبيا',
  APP_VERSION: '2.0.0',

  // Localization
  DEFAULT_LOCALE: 'ar-LY',
  SUPPORTED_LOCALES: ['ar-LY', 'en-US'] as const,

  // Upload Configuration
  UPLOAD_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  UPLOAD_ACCEPTED_FORMATS: ['.jpg', '.jpeg', '.png', '.webp'] as const,
} as const;

// Helper functions
export const getApiUrl = (path: string): string => {
  const baseUrl = publicConfig.API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

export const getWsUrl = (namespace?: string): string => {
  const baseUrl = publicConfig.WS_URL;
  return namespace ? `${baseUrl}/${namespace}` : baseUrl;
};

export const getSiteUrl = (path: string = ''): string => {
  const baseUrl = publicConfig.SITE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

// Feature flags (public only)
export const featureFlags = {
  enableAuctions: true,
  enableMarketplace: true,
  enableTransport: true,
  enableShowrooms: true,
  enableCompanies: true,
  enableWallets: true,
  enableChat: true,
  enableNotifications: true,
  maintenanceMode: false,
} as const;

// Export type for feature flags
export type FeatureFlags = typeof featureFlags;
