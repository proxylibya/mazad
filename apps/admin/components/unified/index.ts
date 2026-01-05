/**
 * 🎯 تصدير المكونات الموحدة
 * Unified Components Export
 * 
 * استخدم هذه المكونات في جميع صفحات لوحة التحكم
 * لضمان تجربة مستخدم موحدة
 */

// ================== Image Components ==================
export { ImageGallery, ProductImage, default as UnifiedImage, UserAvatar } from './UnifiedImage';

// ================== Table Components ==================
export { ColumnPresets, default as UnifiedTable } from './UnifiedTable';

// ================== Stats Components ==================
export { StatCardComponent, StatsPresets, default as UnifiedStats } from './UnifiedStats';

// ================== Toast Components ==================
export {
    SimpleToast, default as Toast,
    ToastContainer,
    ToastProvider,
    useToast
} from './UnifiedToast';

// ================== Search Components ==================
export {
    CommonFilters, FilterSelect, SearchInput, default as UnifiedSearch, useSearchFilter
} from './UnifiedSearch';

export { AnimatedPresence, AnimatedSection, PageTransition, RouteProgressBar } from './UnifiedAnimation';

// ================== Re-export Types ==================
export type {
    BaseEntity, EntityStatus,
    EntityType, FilterOption, ImageConfig, ImageableEntity, SearchFilterConfig, StatCard, StatusConfig, StatusableEntity, TableColumn,
    TableConfig, ToastConfig, ToastType
} from '../../lib/unified-admin-system';

// ================== Re-export Utilities ==================
export {

    DEFAULT_TABLE_TEXT_MAX_LENGTH,
    // Labels
    ENTITY_LABELS, IMAGE_ROUNDED, IMAGE_SIZES, ROLE_LABELS,
    SERVICE_TYPE_LABELS,
    // Status
    STATUS_CONFIG,
    // Stats
    STAT_COLORS,
    // Toast
    TOAST_CONFIG, formatDate, formatNumber,
    // Formatting
    formatPhoneNumber, formatPrice, getAllEntityImages, getEntityImage,
    getImageUrl, getStatusClasses, getStatusConfig,
    // Images
    parseImages,
    truncateText
} from '../../lib/unified-admin-system';

