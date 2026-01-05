/**
 * ═══════════════════════════════════════════════════════════════
 * 🌍 GLOBAL TYPE DECLARATIONS
 * تعريفات الأنواع العالمية لحل أخطاء TypeScript
 * ═══════════════════════════════════════════════════════════════
 */

// === Module Declarations للـ modules المفقودة ===
declare module '../admin/charts/DashboardCharts' {
    const DashboardCharts: React.FC<Record<string, unknown>>;
    export default DashboardCharts;
    export { DashboardCharts };
}

declare module '../admin/InteractiveChart' {
    const InteractiveChart: React.FC<Record<string, unknown>>;
    export default InteractiveChart;
    export { InteractiveChart };
}

declare module '../cache/localKeyDB' {
    export const localKeyDB: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown, ttl?: number) => Promise<void>;
        del: (key: string) => Promise<void>;
    };
    export default localKeyDB;
}

// smart-message-cache implemented in lib/cache/smart-message-cache.ts

declare module '../lib/monitoring/performanceMonitor' {
    export const performanceMonitor: {
        start: (name: string) => void;
        end: (name: string) => number;
        measure: <T>(name: string, fn: () => T) => T;
    };
    export default performanceMonitor;
}

declare module './prisma-unified' {
    export * from '@prisma/client';
    export { prisma } from '../lib/prisma';
}

declare module './ui/MissingIcons' {
    export const CarIcon: React.FC<React.SVGProps<SVGSVGElement>>;
    export const ForwardIcon: React.FC<React.SVGProps<SVGSVGElement>>;
    export const FuelIcon: React.FC<React.SVGProps<SVGSVGElement>>;
}

declare module '../utils/numberFormat' {
    export function formatNumber(num: number): string;
    export function formatCurrency(amount: number, currency?: string): string;
    export function parseFormattedNumber(str: string): number;
}

declare module '@/components/admin/AnalyticsDashboard' {
    const AnalyticsDashboard: React.FC<Record<string, unknown>>;
    export default AnalyticsDashboard;
}

declare module '@/components/admin/dashboard/DashboardStats' {
    const DashboardStats: React.FC<Record<string, unknown>>;
    export default DashboardStats;
}

declare module '@/components/admin/dashboard/SystemHealthPanel' {
    const SystemHealthPanel: React.FC<Record<string, unknown>>;
    export default SystemHealthPanel;
}

declare module '@/components/admin/PerformanceMonitor' {
    const PerformanceMonitor: React.FC<Record<string, unknown>>;
    export default PerformanceMonitor;
}

declare module '@/components/auctions/AuctionCard' {
    interface AuctionCardProps {
        auction: Record<string, unknown>;
        onBid?: () => void;
    }
    const AuctionCard: React.FC<AuctionCardProps>;
    export default AuctionCard;
}

declare module '@/components/cars/CarCard' {
    interface CarCardProps {
        car: Record<string, unknown>;
        onClick?: () => void;
    }
    const CarCard: React.FC<CarCardProps>;
    export default CarCard;
}

declare module '@/components/layout/Footer' {
    const Footer: React.FC;
    export default Footer;
}

declare module '@/components/layout/Header' {
    const Header: React.FC;
    export default Header;
}

declare module '@/components/layout/Sidebar' {
    const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void; }>;
    export default Sidebar;
}

declare module '@/components/ui/DataTable' {
    interface DataTableProps<T> {
        data: T[];
        columns: Array<{ key: string; header: string; }>;
        onRowClick?: (row: T) => void;
    }
    function DataTable<T>(props: DataTableProps<T>): JSX.Element;
    export default DataTable;
}

declare module '@/components/ui/Modal' {
    interface ModalProps {
        isOpen: boolean;
        onClose: () => void;
        title?: string;
        children: React.ReactNode;
    }
    const Modal: React.FC<ModalProps>;
    export default Modal;
}

declare module '@/components/ui/skeleton' {
    export const Skeleton: React.FC<{ className?: string; width?: string | number; height?: string | number; }>;
    export default Skeleton;
}

declare module '@/components/unified' {
    export * from '../components/index';
}

declare module '@/components/users/UserProfile' {
    interface UserProfileProps {
        userId: string;
    }
    const UserProfile: React.FC<UserProfileProps>;
    export default UserProfile;
}

declare module '@/utils/auth' {
    export function verifyToken(token: string): Promise<unknown>;
    export function getUserFromToken(token: string): Promise<unknown>;
    export function isAuthenticated(): boolean;
}

declare module '@heroicons/react/24/outline/PaletteIcon' {
    const PaletteIcon: React.FC<React.SVGProps<SVGSVGElement>>;
    export default PaletteIcon;
}

declare module 'swagger-jsdoc' {
    interface SwaggerOptions {
        definition: Record<string, unknown>;
        apis: string[];
    }
    function swaggerJsdoc(options: SwaggerOptions): Record<string, unknown>;
    export default swaggerJsdoc;
}

// === Augment existing modules ===
declare module 'next' {
    export interface NextApiRequest {
        user?: {
            id: string;
            name?: string;
            email?: string;
            role?: string;
            [key: string]: unknown;
        };
        session?: {
            user?: Record<string, unknown>;
            [key: string]: unknown;
        };
        file?: {
            fieldname: string;
            originalname: string;
            encoding: string;
            mimetype: string;
            size: number;
            buffer: Buffer;
            path?: string;
        };
        files?: Array<{
            fieldname: string;
            originalname: string;
            encoding: string;
            mimetype: string;
            size: number;
            buffer: Buffer;
            path?: string;
        }>;
    }
}

// === Global type extensions ===
declare global {
    // Window extensions
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION__?: () => unknown;
        ethereum?: Record<string, unknown>;
        solana?: Record<string, unknown>;
    }

    // Generic utility types
    type DeepPartial<T> = {
        [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
    };

    type Nullable<T> = T | null;
    type Optional<T> = T | undefined;
    type Maybe<T> = T | null | undefined;

    // API Response types
    interface ApiSuccessResponse<T = unknown> {
        success: true;
        data: T;
        message?: string;
    }

    interface ApiErrorResponse {
        success: false;
        error: string;
        code?: string;
        details?: unknown;
    }

    type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

    // Common entity interfaces
    interface BaseEntity {
        id: string;
        createdAt?: Date | string;
        updatedAt?: Date | string;
    }

    interface UserEntity extends BaseEntity {
        name?: string;
        email?: string;
        phone?: string;
        profileImage?: string;
        verified?: boolean;
        role?: string;
        accountType?: string;
        rating?: number;
        status?: string;
    }

    interface CarEntity extends BaseEntity {
        title: string;
        brand: string;
        model: string;
        year: number;
        price: number;
        images?: string | string[];
        condition?: string;
        mileage?: number;
        location?: string;
        sellerId?: string;
        status?: string;
        featured?: boolean;
        isAuction?: boolean;
        [key: string]: unknown;
    }

    interface AuctionEntity extends BaseEntity {
        title: string;
        carId?: string;
        sellerId: string;
        currentPrice: number;
        startPrice: number;
        status: string;
        startTime?: Date | string;
        endTime?: Date | string;
        totalBids?: number;
        [key: string]: unknown;
    }

    interface BidEntity extends BaseEntity {
        amount: number;
        auctionId: string;
        bidderId: string;
        [key: string]: unknown;
    }
}

export { };

