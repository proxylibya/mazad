// @ts-nocheck
/**
 * ============================================
 * 🔍 UNIFIED SEARCH, FILTER & PAGINATION SYSTEM
 * نظام البحث والفلترة والـ Pagination الموحد
 * ============================================
 * 
 * Enterprise-grade unified system for:
 * - Full-text search across all entities
 * - Advanced filtering with multiple criteria
 * - Cursor & Offset pagination
 * - Real-time suggestions
 * - Caching & Performance optimization
 * 
 * @version 2.0.0
 * @author Sooq Mazad Team
 */

import type { PrismaClient } from '@prisma/client';

import prisma from '@/lib/prisma';

// ============================================
// TYPES & INTERFACES
// ============================================

/** Entity types that can be searched */
export type SearchableEntity = 'car' | 'auction' | 'showroom' | 'transport' | 'user';

/** Sort order */
export type SortOrder = 'asc' | 'desc';

/** Pagination type */
export type PaginationType = 'offset' | 'cursor';

/** Filter operator types */
export type FilterOperator =
    | 'equals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'notIn'
    | 'between'
    | 'isNull'
    | 'isNotNull';

/** Single filter condition */
export interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value: any;
}

/** Filter group with AND/OR logic */
export interface FilterGroup {
    logic: 'AND' | 'OR';
    conditions: (FilterCondition | FilterGroup)[];
}

/** Sort configuration */
export interface SortConfig {
    field: string;
    order: SortOrder;
}

/** Pagination configuration */
export interface PaginationConfig {
    type: PaginationType;
    page?: number;
    limit: number;
    cursor?: string;
}

/** Search options */
export interface SearchOptions {
    query: string;
    entities?: SearchableEntity[];
    filters?: FilterCondition[] | FilterGroup;
    sort?: SortConfig[];
    pagination: PaginationConfig;
    highlight?: boolean;
    fuzzy?: boolean;
    minRelevance?: number;
}

/** Single search result */
export interface SearchResult<T = any> {
    id: string;
    type: SearchableEntity;
    data: T;
    relevance: number;
    highlights?: Record<string, string[]>;
    url: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string;
        prevCursor?: string;
    };
    meta: {
        query?: string;
        filters?: any;
        sort?: SortConfig[];
        executionTime: number;
        cached: boolean;
    };
    aggregations?: {
        byType?: Record<string, number>;
        byLocation?: Record<string, number>;
        byBrand?: Record<string, number>;
        byPrice?: { min: number; max: number; avg: number; };
        byYear?: { min: number; max: number; };
    };
}

/** Filter preset */
export interface FilterPreset {
    id: string;
    name: string;
    nameAr: string;
    entity: SearchableEntity;
    filters: FilterCondition[];
    sort?: SortConfig[];
    isDefault?: boolean;
}

// ============================================
// FILTER PRESETS (القوائم الثابتة)
// ============================================

export const FILTER_PRESETS: Record<SearchableEntity, FilterPreset[]> = {
    car: [
        {
            id: 'newest',
            name: 'Newest First',
            nameAr: 'الأحدث أولاً',
            entity: 'car',
            filters: [{ field: 'status', operator: 'equals', value: 'AVAILABLE' }],
            sort: [{ field: 'createdAt', order: 'desc' }],
            isDefault: true
        },
        {
            id: 'price-low',
            name: 'Price: Low to High',
            nameAr: 'السعر: من الأقل للأعلى',
            entity: 'car',
            filters: [{ field: 'status', operator: 'equals', value: 'AVAILABLE' }],
            sort: [{ field: 'price', order: 'asc' }]
        },
        {
            id: 'price-high',
            name: 'Price: High to Low',
            nameAr: 'السعر: من الأعلى للأقل',
            entity: 'car',
            filters: [{ field: 'status', operator: 'equals', value: 'AVAILABLE' }],
            sort: [{ field: 'price', order: 'desc' }]
        },
        {
            id: 'featured',
            name: 'Featured',
            nameAr: 'المميزة',
            entity: 'car',
            filters: [
                { field: 'status', operator: 'equals', value: 'AVAILABLE' },
                { field: 'featured', operator: 'equals', value: true }
            ],
            sort: [{ field: 'createdAt', order: 'desc' }]
        }
    ],
    auction: [
        {
            id: 'active',
            name: 'Active Auctions',
            nameAr: 'المزادات النشطة',
            entity: 'auction',
            filters: [{ field: 'status', operator: 'in', value: ['ACTIVE', 'UPCOMING'] }],
            sort: [{ field: 'endDate', order: 'asc' }],
            isDefault: true
        },
        {
            id: 'ending-soon',
            name: 'Ending Soon',
            nameAr: 'ينتهي قريباً',
            entity: 'auction',
            filters: [{ field: 'status', operator: 'equals', value: 'ACTIVE' }],
            sort: [{ field: 'endDate', order: 'asc' }]
        },
        {
            id: 'most-bids',
            name: 'Most Bids',
            nameAr: 'الأكثر مزايدات',
            entity: 'auction',
            filters: [{ field: 'status', operator: 'in', value: ['ACTIVE', 'UPCOMING'] }],
            sort: [{ field: 'totalBids', order: 'desc' }]
        }
    ],
    showroom: [
        {
            id: 'verified',
            name: 'Verified Showrooms',
            nameAr: 'المعارض الموثقة',
            entity: 'showroom',
            filters: [
                { field: 'verified', operator: 'equals', value: true },
                { field: 'status', operator: 'equals', value: 'ACTIVE' }
            ],
            sort: [{ field: 'rating', order: 'desc' }],
            isDefault: true
        },
        {
            id: 'top-rated',
            name: 'Top Rated',
            nameAr: 'الأعلى تقييماً',
            entity: 'showroom',
            filters: [{ field: 'status', operator: 'equals', value: 'ACTIVE' }],
            sort: [{ field: 'rating', order: 'desc' }]
        }
    ],
    transport: [
        {
            id: 'available',
            name: 'Available Services',
            nameAr: 'الخدمات المتاحة',
            entity: 'transport',
            filters: [{ field: 'isAvailable', operator: 'equals', value: true }],
            sort: [{ field: 'rating', order: 'desc' }],
            isDefault: true
        }
    ],
    user: [
        {
            id: 'active',
            name: 'Active Users',
            nameAr: 'المستخدمون النشطون',
            entity: 'user',
            filters: [{ field: 'isActive', operator: 'equals', value: true }],
            sort: [{ field: 'createdAt', order: 'desc' }],
            isDefault: true
        }
    ]
};

// ============================================
// STATIC DATA (القوائم الثابتة للفلاتر)
// ============================================

export const FILTER_OPTIONS = {
    // المدن الليبية
    cities: [
        { value: 'طرابلس', label: 'طرابلس', labelEn: 'Tripoli' },
        { value: 'بنغازي', label: 'بنغازي', labelEn: 'Benghazi' },
        { value: 'مصراتة', label: 'مصراتة', labelEn: 'Misrata' },
        { value: 'الزاوية', label: 'الزاوية', labelEn: 'Zawiya' },
        { value: 'زليتن', label: 'زليتن', labelEn: 'Zliten' },
        { value: 'البيضاء', label: 'البيضاء', labelEn: 'Bayda' },
        { value: 'طبرق', label: 'طبرق', labelEn: 'Tobruk' },
        { value: 'صبراتة', label: 'صبراتة', labelEn: 'Sabratha' },
        { value: 'درنة', label: 'درنة', labelEn: 'Derna' },
        { value: 'سرت', label: 'سرت', labelEn: 'Sirte' },
        { value: 'الخمس', label: 'الخمس', labelEn: 'Khoms' },
        { value: 'ترهونة', label: 'ترهونة', labelEn: 'Tarhuna' },
        { value: 'سبها', label: 'سبها', labelEn: 'Sabha' },
        { value: 'غريان', label: 'غريان', labelEn: 'Gharyan' },
        { value: 'جنزور', label: 'جنزور', labelEn: 'Janzour' },
        { value: 'تاجوراء', label: 'تاجوراء', labelEn: 'Tajoura' },
        { value: 'عين زارة', label: 'عين زارة', labelEn: 'Ain Zara' },
        { value: 'أبوسليم', label: 'أبوسليم', labelEn: 'Abu Salim' },
    ],

    // ماركات السيارات
    brands: [
        { value: 'تويوتا', label: 'تويوتا', labelEn: 'Toyota' },
        { value: 'نيسان', label: 'نيسان', labelEn: 'Nissan' },
        { value: 'هيونداي', label: 'هيونداي', labelEn: 'Hyundai' },
        { value: 'كيا', label: 'كيا', labelEn: 'Kia' },
        { value: 'هوندا', label: 'هوندا', labelEn: 'Honda' },
        { value: 'مرسيدس', label: 'مرسيدس', labelEn: 'Mercedes' },
        { value: 'بي إم دبليو', label: 'بي إم دبليو', labelEn: 'BMW' },
        { value: 'أودي', label: 'أودي', labelEn: 'Audi' },
        { value: 'فولكس فاجن', label: 'فولكس فاجن', labelEn: 'Volkswagen' },
        { value: 'فورد', label: 'فورد', labelEn: 'Ford' },
        { value: 'شيفروليه', label: 'شيفروليه', labelEn: 'Chevrolet' },
        { value: 'جيب', label: 'جيب', labelEn: 'Jeep' },
        { value: 'لاند روفر', label: 'لاند روفر', labelEn: 'Land Rover' },
        { value: 'بورش', label: 'بورش', labelEn: 'Porsche' },
        { value: 'لكزس', label: 'لكزس', labelEn: 'Lexus' },
        { value: 'إنفينيتي', label: 'إنفينيتي', labelEn: 'Infiniti' },
        { value: 'مازدا', label: 'مازدا', labelEn: 'Mazda' },
        { value: 'ميتسوبيشي', label: 'ميتسوبيشي', labelEn: 'Mitsubishi' },
        { value: 'سوزوكي', label: 'سوزوكي', labelEn: 'Suzuki' },
        { value: 'بيجو', label: 'بيجو', labelEn: 'Peugeot' },
        { value: 'رينو', label: 'رينو', labelEn: 'Renault' },
        { value: 'فيات', label: 'فيات', labelEn: 'Fiat' },
        { value: 'أخرى', label: 'أخرى', labelEn: 'Other' },
    ],

    // أنواع الهيكل
    bodyTypes: [
        { value: 'سيدان', label: 'سيدان', labelEn: 'Sedan' },
        { value: 'هاتشباك', label: 'هاتشباك', labelEn: 'Hatchback' },
        { value: 'SUV', label: 'SUV', labelEn: 'SUV' },
        { value: 'كروس أوفر', label: 'كروس أوفر', labelEn: 'Crossover' },
        { value: 'كوبيه', label: 'كوبيه', labelEn: 'Coupe' },
        { value: 'كشف', label: 'كشف', labelEn: 'Convertible' },
        { value: 'بيك أب', label: 'بيك أب', labelEn: 'Pickup' },
        { value: 'فان', label: 'فان', labelEn: 'Van' },
        { value: 'ستيشن', label: 'ستيشن', labelEn: 'Station Wagon' },
    ],

    // نوع الوقود
    fuelTypes: [
        { value: 'بنزين', label: 'بنزين', labelEn: 'Petrol' },
        { value: 'ديزل', label: 'ديزل', labelEn: 'Diesel' },
        { value: 'هايبرد', label: 'هايبرد', labelEn: 'Hybrid' },
        { value: 'كهرباء', label: 'كهرباء', labelEn: 'Electric' },
        { value: 'غاز', label: 'غاز', labelEn: 'Gas' },
    ],

    // ناقل الحركة
    transmissions: [
        { value: 'أوتوماتيك', label: 'أوتوماتيك', labelEn: 'Automatic' },
        { value: 'مانيوال', label: 'مانيوال', labelEn: 'Manual' },
        { value: 'CVT', label: 'CVT', labelEn: 'CVT' },
    ],

    // حالة السيارة
    conditions: [
        { value: 'NEW', label: 'جديدة', labelEn: 'New' },
        { value: 'USED', label: 'مستعملة', labelEn: 'Used' },
        { value: 'CERTIFIED', label: 'معتمدة', labelEn: 'Certified' },
    ],

    // نطاقات السعر (بالدينار الليبي)
    priceRanges: [
        { value: '0-50000', label: 'أقل من 50,000', min: 0, max: 50000 },
        { value: '50000-100000', label: '50,000 - 100,000', min: 50000, max: 100000 },
        { value: '100000-200000', label: '100,000 - 200,000', min: 100000, max: 200000 },
        { value: '200000-500000', label: '200,000 - 500,000', min: 200000, max: 500000 },
        { value: '500000+', label: 'أكثر من 500,000', min: 500000, max: null },
    ],

    // نطاقات السنة
    yearRanges: (() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= 1990; year--) {
            years.push({ value: year.toString(), label: year.toString() });
        }
        return years;
    })(),

    // حالة المزاد
    auctionStatuses: [
        { value: 'UPCOMING', label: 'قادم', labelEn: 'Upcoming' },
        { value: 'ACTIVE', label: 'نشط', labelEn: 'Active' },
        { value: 'ENDED', label: 'منتهي', labelEn: 'Ended' },
        { value: 'SOLD', label: 'تم البيع', labelEn: 'Sold' },
        { value: 'CANCELLED', label: 'ملغي', labelEn: 'Cancelled' },
    ],

    // خدمات النقل
    transportTypes: [
        { value: 'شحن محلي', label: 'شحن محلي', labelEn: 'Local Shipping' },
        { value: 'شحن دولي', label: 'شحن دولي', labelEn: 'International Shipping' },
        { value: 'نقل داخلي', label: 'نقل داخلي', labelEn: 'Internal Transport' },
        { value: 'سطحة', label: 'سطحة', labelEn: 'Flatbed' },
        { value: 'ونش', label: 'ونش', labelEn: 'Tow Truck' },
    ],
};

// ============================================
// SEARCH ENGINE CLASS
// ============================================

export class UnifiedSearchEngine {
    private prisma: PrismaClient;
    private cache: Map<string, { data: any; timestamp: number; }> = new Map();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || prisma;
    }

    /**
     * Main search method
     */
    async search<T = any>(options: SearchOptions): Promise<PaginatedResponse<SearchResult<T>>> {
        const startTime = Date.now();
        const cacheKey = this.generateCacheKey(options);

        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return { ...cached, meta: { ...cached.meta, cached: true } };
        }

        const {
            query,
            entities = ['car', 'auction', 'showroom', 'transport'],
            filters,
            sort = [{ field: 'relevance', order: 'desc' }],
            pagination,
            highlight = true,
            fuzzy = true,
            minRelevance = 0
        } = options;

        // Clean query
        const cleanQuery = this.cleanQuery(query);
        const searchTerms = this.tokenize(cleanQuery);

        // Search in each entity
        const allResults: SearchResult<T>[] = [];

        for (const entity of entities) {
            const entityResults = await this.searchEntity<T>(entity, searchTerms, filters, pagination.limit);
            allResults.push(...entityResults);
        }

        // Calculate relevance and sort
        const scoredResults = this.calculateRelevance(allResults, searchTerms, minRelevance);
        const sortedResults = this.sortResults(scoredResults, sort);

        // Apply pagination
        const paginatedData = this.paginate(sortedResults, pagination);

        // Add highlights if requested
        if (highlight) {
            paginatedData.data = paginatedData.data.map(result => ({
                ...result,
                highlights: this.generateHighlights(result, searchTerms)
            }));
        }

        // Calculate aggregations
        const aggregations = this.calculateAggregations(sortedResults);

        const response: PaginatedResponse<SearchResult<T>> = {
            ...paginatedData,
            meta: {
                query: cleanQuery,
                filters,
                sort,
                executionTime: Date.now() - startTime,
                cached: false
            },
            aggregations
        };

        // Cache the result
        this.setCache(cacheKey, response);

        return response;
    }

    /**
     * Search in a specific entity
     */
    private async searchEntity<T>(
        entity: SearchableEntity,
        searchTerms: string[],
        filters: FilterCondition[] | FilterGroup | undefined,
        limit: number
    ): Promise<SearchResult<T>[]> {
        const where = this.buildWhereClause(entity, searchTerms, filters);

        switch (entity) {
            case 'car':
                return this.searchCars<T>(where, limit);
            case 'auction':
                return this.searchAuctions<T>(where, limit);
            case 'showroom':
                return this.searchShowrooms<T>(where, limit);
            case 'transport':
                return this.searchTransport<T>(where, limit);
            case 'user':
                return this.searchUsers<T>(where, limit);
            default:
                return [];
        }
    }

    /**
     * Search cars
     */
    private async searchCars<T>(where: any, limit: number): Promise<SearchResult<T>[]> {
        try {
            const cars = await this.prisma.cars.findMany({
                where: {
                    ...where,
                    status: 'AVAILABLE',
                    isAuction: false
                },
                take: limit,
                orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
                select: {
                    id: true,
                    title: true,
                    brand: true,
                    model: true,
                    year: true,
                    price: true,
                    location: true,
                    area: true,
                    condition: true,
                    images: true,
                    description: true,
                    featured: true,
                    views: true,
                    car_images: {
                        where: { isPrimary: true },
                        take: 1,
                        select: { fileUrl: true }
                    }
                }
            });

            return cars.map(car => ({
                id: car.id,
                type: 'car' as SearchableEntity,
                data: car as unknown as T,
                relevance: 0,
                url: `/marketplace/${car.id}`
            }));
        } catch (error) {
            console.error('[SearchEngine] Error searching cars:', error);
            return [];
        }
    }

    /**
     * Search auctions
     */
    private async searchAuctions<T>(where: any, limit: number): Promise<SearchResult<T>[]> {
        try {
            const auctions = await this.prisma.auctions.findMany({
                where: {
                    ...where,
                    status: { in: ['UPCOMING', 'ACTIVE'] },
                    yardId: null, // ✅ مزادات أونلاين فقط - استبعاد مزادات الساحات
                },
                take: limit,
                orderBy: [{ featured: 'desc' }, { endDate: 'asc' }],
                include: {
                    cars: {
                        select: {
                            id: true,
                            title: true,
                            brand: true,
                            model: true,
                            year: true,
                            location: true,
                            images: true,
                            car_images: {
                                where: { isPrimary: true },
                                take: 1,
                                select: { fileUrl: true }
                            }
                        }
                    }
                }
            });

            return auctions.map(auction => ({
                id: auction.id,
                type: 'auction' as SearchableEntity,
                data: auction as unknown as T,
                relevance: 0,
                url: `/auction/${auction.id}`
            }));
        } catch (error) {
            console.error('[SearchEngine] Error searching auctions:', error);
            return [];
        }
    }

    /**
     * Search showrooms
     */
    private async searchShowrooms<T>(where: any, limit: number): Promise<SearchResult<T>[]> {
        try {
            const showrooms = await this.prisma.showrooms.findMany({
                where: {
                    ...where,
                    status: 'ACTIVE'
                },
                take: limit,
                orderBy: [{ verified: 'desc' }, { rating: 'desc' }]
            });

            return showrooms.map(showroom => ({
                id: showroom.id,
                type: 'showroom' as SearchableEntity,
                data: showroom as unknown as T,
                relevance: 0,
                url: `/showroom/${showroom.id}`
            }));
        } catch (error) {
            console.error('[SearchEngine] Error searching showrooms:', error);
            return [];
        }
    }

    /**
     * Search transport services
     */
    private async searchTransport<T>(where: any, limit: number): Promise<SearchResult<T>[]> {
        try {
            const services = await this.prisma.transport_services.findMany({
                where: {
                    ...where,
                    isAvailable: true
                },
                take: limit,
                orderBy: [{ rating: 'desc' }]
            });

            return services.map(service => ({
                id: service.id,
                type: 'transport' as SearchableEntity,
                data: service as unknown as T,
                relevance: 0,
                url: `/transport/${service.id}`
            }));
        } catch (error) {
            console.error('[SearchEngine] Error searching transport:', error);
            return [];
        }
    }

    /**
     * Search users
     */
    private async searchUsers<T>(where: any, limit: number): Promise<SearchResult<T>[]> {
        try {
            const users = await this.prisma.users.findMany({
                where: {
                    ...where,
                    isActive: true
                },
                take: limit,
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    city: true,
                    avatar: true,
                    isVerified: true
                }
            });

            return users.map(user => ({
                id: user.id,
                type: 'user' as SearchableEntity,
                data: user as unknown as T,
                relevance: 0,
                url: `/profile/${user.id}`
            }));
        } catch (error) {
            console.error('[SearchEngine] Error searching users:', error);
            return [];
        }
    }

    /**
     * Build WHERE clause for Prisma
     */
    private buildWhereClause(
        entity: SearchableEntity,
        searchTerms: string[],
        filters?: FilterCondition[] | FilterGroup
    ): any {
        const where: any = {};

        // Build text search conditions
        if (searchTerms.length > 0) {
            const searchFields = this.getSearchFields(entity);
            where.OR = searchTerms.flatMap(term =>
                searchFields.map(field => ({
                    [field]: { contains: term, mode: 'insensitive' }
                }))
            );
        }

        // Apply filters
        if (filters) {
            const filterConditions = this.buildFilterConditions(filters);
            if (filterConditions.length > 0) {
                where.AND = filterConditions;
            }
        }

        return where;
    }

    /**
     * Get searchable fields for each entity
     */
    private getSearchFields(entity: SearchableEntity): string[] {
        const fields: Record<SearchableEntity, string[]> = {
            car: ['title', 'brand', 'model', 'description', 'location'],
            auction: ['title', 'description'],
            showroom: ['name', 'description', 'city', 'area'],
            transport: ['name', 'description', 'serviceType'],
            user: ['name', 'city']
        };
        return fields[entity] || [];
    }

    /**
     * Build filter conditions for Prisma
     */
    private buildFilterConditions(filters: FilterCondition[] | FilterGroup): any[] {
        if (Array.isArray(filters)) {
            return filters.map(f => this.buildSingleCondition(f));
        }

        // Handle FilterGroup
        const conditions = filters.conditions.map(c => {
            if ('logic' in c) {
                return { [c.logic]: this.buildFilterConditions(c as FilterGroup) };
            }
            return this.buildSingleCondition(c as FilterCondition);
        });

        return filters.logic === 'OR' ? [{ OR: conditions }] : conditions;
    }

    /**
     * Build single filter condition
     */
    private buildSingleCondition(filter: FilterCondition): any {
        const { field, operator, value } = filter;

        switch (operator) {
            case 'equals':
                return { [field]: value };
            case 'contains':
                return { [field]: { contains: value, mode: 'insensitive' } };
            case 'startsWith':
                return { [field]: { startsWith: value, mode: 'insensitive' } };
            case 'endsWith':
                return { [field]: { endsWith: value, mode: 'insensitive' } };
            case 'gt':
                return { [field]: { gt: value } };
            case 'gte':
                return { [field]: { gte: value } };
            case 'lt':
                return { [field]: { lt: value } };
            case 'lte':
                return { [field]: { lte: value } };
            case 'in':
                return { [field]: { in: value } };
            case 'notIn':
                return { [field]: { notIn: value } };
            case 'between':
                return { [field]: { gte: value[0], lte: value[1] } };
            case 'isNull':
                return { [field]: null };
            case 'isNotNull':
                return { [field]: { not: null } };
            default:
                return { [field]: value };
        }
    }

    /**
     * Clean and normalize query
     */
    private cleanQuery(query: string): string {
        return query
            .trim()
            .toLowerCase()
            .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // Keep Arabic and Latin chars
            .replace(/\s+/g, ' ');
    }

    /**
     * Tokenize query into search terms
     */
    private tokenize(query: string): string[] {
        return query
            .split(' ')
            .filter(term => term.length >= 2)
            .slice(0, 10); // Limit to 10 terms
    }

    /**
     * Calculate relevance score
     */
    private calculateRelevance<T>(
        results: SearchResult<T>[],
        searchTerms: string[],
        minRelevance: number
    ): SearchResult<T>[] {
        return results
            .map(result => {
                let score = 0;
                const data = result.data as any;
                const title = (data.title || data.name || '').toLowerCase();
                const description = (data.description || '').toLowerCase();

                searchTerms.forEach(term => {
                    // Title match (higher weight)
                    if (title.includes(term)) score += 10;
                    if (title.startsWith(term)) score += 5;

                    // Description match
                    if (description.includes(term)) score += 3;

                    // Brand/Model match for cars
                    if (data.brand?.toLowerCase().includes(term)) score += 8;
                    if (data.model?.toLowerCase().includes(term)) score += 8;

                    // Location match
                    if (data.location?.toLowerCase().includes(term)) score += 2;
                });

                // Boost for featured items
                if (data.featured) score += 5;

                return { ...result, relevance: score };
            })
            .filter(result => result.relevance >= minRelevance);
    }

    /**
     * Sort results
     */
    private sortResults<T>(results: SearchResult<T>[], sort: SortConfig[]): SearchResult<T>[] {
        return results.sort((a, b) => {
            for (const { field, order } of sort) {
                let aVal: any, bVal: any;

                if (field === 'relevance') {
                    aVal = a.relevance;
                    bVal = b.relevance;
                } else {
                    aVal = (a.data as any)[field];
                    bVal = (b.data as any)[field];
                }

                if (aVal < bVal) return order === 'asc' ? -1 : 1;
                if (aVal > bVal) return order === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    /**
     * Paginate results
     */
    private paginate<T>(
        results: SearchResult<T>[],
        config: PaginationConfig
    ): Omit<PaginatedResponse<SearchResult<T>>, 'meta' | 'aggregations'> {
        const { type, page = 1, limit, cursor } = config;
        const total = results.length;
        const totalPages = Math.ceil(total / limit);

        let data: SearchResult<T>[];
        let currentPage = page;

        if (type === 'cursor' && cursor) {
            const cursorIndex = results.findIndex(r => r.id === cursor);
            const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
            data = results.slice(start, start + limit);
        } else {
            const start = (page - 1) * limit;
            data = results.slice(start, start + limit);
        }

        const lastItem = data[data.length - 1];
        const firstItem = data[0];

        return {
            data,
            pagination: {
                total,
                page: currentPage,
                limit,
                totalPages,
                hasNext: type === 'cursor'
                    ? data.length === limit
                    : currentPage < totalPages,
                hasPrev: type === 'cursor'
                    ? !!cursor
                    : currentPage > 1,
                nextCursor: lastItem?.id,
                prevCursor: firstItem?.id
            }
        };
    }

    /**
     * Generate highlights
     */
    private generateHighlights<T>(result: SearchResult<T>, searchTerms: string[]): Record<string, string[]> {
        const highlights: Record<string, string[]> = {};
        const data = result.data as any;

        const fields = ['title', 'name', 'description', 'brand', 'model'];

        fields.forEach(field => {
            const value = data[field];
            if (!value) return;

            const matches: string[] = [];
            searchTerms.forEach(term => {
                const regex = new RegExp(`(.{0,20})(${term})(.{0,20})`, 'gi');
                const fieldMatches = value.matchAll(regex);
                for (const match of fieldMatches) {
                    matches.push(`...${match[1]}<mark>${match[2]}</mark>${match[3]}...`);
                }
            });

            if (matches.length > 0) {
                highlights[field] = matches.slice(0, 3);
            }
        });

        return highlights;
    }

    /**
     * Calculate aggregations
     */
    private calculateAggregations<T>(results: SearchResult<T>[]): PaginatedResponse<T>['aggregations'] {
        const byType: Record<string, number> = {};
        const byLocation: Record<string, number> = {};
        const byBrand: Record<string, number> = {};
        const prices: number[] = [];
        const years: number[] = [];

        results.forEach(result => {
            const data = result.data as any;

            // By type
            byType[result.type] = (byType[result.type] || 0) + 1;

            // By location
            if (data.location) {
                byLocation[data.location] = (byLocation[data.location] || 0) + 1;
            }

            // By brand
            if (data.brand) {
                byBrand[data.brand] = (byBrand[data.brand] || 0) + 1;
            }

            // Price stats
            if (data.price) {
                prices.push(data.price);
            }

            // Year stats
            if (data.year) {
                years.push(data.year);
            }
        });

        return {
            byType,
            byLocation,
            byBrand,
            byPrice: prices.length > 0 ? {
                min: Math.min(...prices),
                max: Math.max(...prices),
                avg: prices.reduce((a, b) => a + b, 0) / prices.length
            } : undefined,
            byYear: years.length > 0 ? {
                min: Math.min(...years),
                max: Math.max(...years)
            } : undefined
        };
    }

    /**
     * Generate cache key
     */
    private generateCacheKey(options: SearchOptions): string {
        return `search:${JSON.stringify(options)}`;
    }

    /**
     * Get from cache
     */
    private getFromCache(key: string): any | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * Set cache
     */
    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });

        // Clean old cache entries
        if (this.cache.size > 100) {
            const oldest = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .slice(0, 50);
            oldest.forEach(([k]) => this.cache.delete(k));
        }
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get suggestions
     */
    async getSuggestions(query: string, limit: number = 8): Promise<any[]> {
        if (query.length < 2) {
            // Return popular searches
            return this.getPopularSearches(limit);
        }

        const cleanQuery = this.cleanQuery(query);
        const suggestions: any[] = [];

        // Search in brands
        const matchingBrands = FILTER_OPTIONS.brands
            .filter(b => b.label.includes(cleanQuery) || b.labelEn.toLowerCase().includes(cleanQuery))
            .slice(0, 3)
            .map(b => ({
                id: `brand-${b.value}`,
                type: 'brand',
                text: b.label,
                subtitle: 'ماركة سيارات',
                icon: '🚗'
            }));
        suggestions.push(...matchingBrands);

        // Search in cities
        const matchingCities = FILTER_OPTIONS.cities
            .filter(c => c.label.includes(cleanQuery) || c.labelEn.toLowerCase().includes(cleanQuery))
            .slice(0, 2)
            .map(c => ({
                id: `city-${c.value}`,
                type: 'location',
                text: c.label,
                subtitle: 'مدينة',
                icon: '📍'
            }));
        suggestions.push(...matchingCities);

        // Add direct search suggestion
        suggestions.push({
            id: `search-${cleanQuery}`,
            type: 'search',
            text: cleanQuery,
            subtitle: 'بحث عن',
            icon: '🔍'
        });

        return suggestions.slice(0, limit);
    }

    /**
     * Get popular searches
     */
    private async getPopularSearches(limit: number): Promise<any[]> {
        return [
            { id: 'pop-1', type: 'popular', text: 'تويوتا كامري', subtitle: 'بحث شائع', icon: '🔥' },
            { id: 'pop-2', type: 'popular', text: 'نيسان سنترا', subtitle: 'بحث شائع', icon: '🔥' },
            { id: 'pop-3', type: 'popular', text: 'هيونداي النترا', subtitle: 'بحث شائع', icon: '🔥' },
            { id: 'pop-4', type: 'popular', text: 'مزادات اليوم', subtitle: 'بحث شائع', icon: '🔥' },
            { id: 'pop-5', type: 'popular', text: 'معارض طرابلس', subtitle: 'بحث شائع', icon: '🔥' },
        ].slice(0, limit);
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let searchEngineInstance: UnifiedSearchEngine | null = null;

export function getSearchEngine(): UnifiedSearchEngine {
    if (!searchEngineInstance) {
        searchEngineInstance = new UnifiedSearchEngine();
    }
    return searchEngineInstance;
}

// ============================================
// EXPORTS
// ============================================

export default UnifiedSearchEngine;
