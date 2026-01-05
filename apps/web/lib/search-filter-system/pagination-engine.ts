// @ts-nocheck
/**
 * ============================================
 * 📄 UNIFIED PAGINATION ENGINE
 * محرك الـ Pagination الموحد
 * ============================================
 * 
 * Supports:
 * - Offset-based pagination (traditional)
 * - Cursor-based pagination (infinite scroll)
 * - Keyset pagination (high performance)
 * - Virtual scrolling support
 * - Cache-friendly pagination
 */

import type { PrismaClient } from '@prisma/client';

import prisma from '@/lib/prisma';

// ============================================
// TYPES
// ============================================

export type PaginationStrategy = 'offset' | 'cursor' | 'keyset';

export interface OffsetPaginationParams {
    strategy: 'offset';
    page: number;
    limit: number;
}

export interface CursorPaginationParams {
    strategy: 'cursor';
    cursor?: string;
    limit: number;
    direction?: 'forward' | 'backward';
}

export interface KeysetPaginationParams {
    strategy: 'keyset';
    lastId?: string;
    lastValue?: any;
    keyField: string;
    limit: number;
}

export type PaginationParams =
    | OffsetPaginationParams
    | CursorPaginationParams
    | KeysetPaginationParams;

export interface PaginationMeta {
    total?: number;
    page?: number;
    limit: number;
    totalPages?: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
    nextKeyValue?: any;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationMeta;
}

export interface PaginationConfig {
    defaultLimit: number;
    maxLimit: number;
    defaultStrategy: PaginationStrategy;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: PaginationConfig = {
    defaultLimit: 20,
    maxLimit: 100,
    defaultStrategy: 'offset'
};

// ============================================
// PAGINATION ENGINE CLASS
// ============================================

export class UnifiedPaginationEngine {
    private config: PaginationConfig;
    private prisma: PrismaClient;

    constructor(config: Partial<PaginationConfig> = {}, prismaClient?: PrismaClient) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.prisma = prismaClient || prisma;
    }

    /**
     * Paginate any Prisma model
     */
    async paginate<T>(
        model: any,
        params: PaginationParams,
        options: {
            where?: any;
            orderBy?: any;
            select?: any;
            include?: any;
        } = {}
    ): Promise<PaginatedResult<T>> {
        // Validate and normalize limit
        const limit = Math.min(
            Math.max(1, params.limit || this.config.defaultLimit),
            this.config.maxLimit
        );

        switch (params.strategy) {
            case 'cursor':
                return this.cursorPaginate<T>(model, { ...params, limit }, options);
            case 'keyset':
                return this.keysetPaginate<T>(model, { ...params, limit }, options);
            case 'offset':
            default:
                return this.offsetPaginate<T>(model, { ...params, limit }, options);
        }
    }

    /**
     * Offset-based pagination (traditional)
     * Best for: Small to medium datasets, when total count is needed
     */
    private async offsetPaginate<T>(
        model: any,
        params: OffsetPaginationParams,
        options: any
    ): Promise<PaginatedResult<T>> {
        const { page, limit } = params;
        const { where, orderBy, select, include } = options;

        const skip = (page - 1) * limit;

        // Execute count and data queries in parallel
        const [total, data] = await Promise.all([
            model.count({ where }),
            model.findMany({
                where,
                orderBy: orderBy || { createdAt: 'desc' },
                skip,
                take: limit,
                select,
                include
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Cursor-based pagination
     * Best for: Large datasets, infinite scroll, real-time data
     */
    private async cursorPaginate<T>(
        model: any,
        params: CursorPaginationParams,
        options: any
    ): Promise<PaginatedResult<T>> {
        const { cursor, limit, direction = 'forward' } = params;
        const { where, orderBy, select, include } = options;

        // Take one extra to check if there are more items
        const take = direction === 'forward' ? limit + 1 : -(limit + 1);

        const queryOptions: any = {
            where,
            orderBy: orderBy || { createdAt: 'desc' },
            take,
            select,
            include
        };

        // Add cursor if provided
        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1; // Skip the cursor item itself
        }

        let data = await model.findMany(queryOptions);

        // Check if we got extra item (meaning there's more)
        const hasMore = data.length > limit;
        if (hasMore) {
            data = direction === 'forward' ? data.slice(0, -1) : data.slice(1);
        }

        // For backward direction, reverse the data
        if (direction === 'backward') {
            data = data.reverse();
        }

        const lastItem = data[data.length - 1];
        const firstItem = data[0];

        return {
            data,
            pagination: {
                limit,
                hasNext: direction === 'forward' ? hasMore : !!cursor,
                hasPrev: direction === 'forward' ? !!cursor : hasMore,
                nextCursor: lastItem?.id,
                prevCursor: firstItem?.id
            }
        };
    }

    /**
     * Keyset pagination
     * Best for: Very large datasets, consistent ordering, high performance
     */
    private async keysetPaginate<T>(
        model: any,
        params: KeysetPaginationParams,
        options: any
    ): Promise<PaginatedResult<T>> {
        const { lastId, lastValue, keyField, limit } = params;
        const { where: baseWhere, orderBy, select, include } = options;

        // Build keyset condition
        let where = { ...baseWhere };

        if (lastId && lastValue !== undefined) {
            where = {
                ...baseWhere,
                OR: [
                    { [keyField]: { lt: lastValue } },
                    {
                        AND: [
                            { [keyField]: lastValue },
                            { id: { lt: lastId } }
                        ]
                    }
                ]
            };
        }

        // Take one extra to check for more
        const data = await model.findMany({
            where,
            orderBy: orderBy || [{ [keyField]: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            select,
            include
        });

        const hasNext = data.length > limit;
        const results = hasNext ? data.slice(0, -1) : data;

        const lastItem = results[results.length - 1];

        return {
            data: results,
            pagination: {
                limit,
                hasNext,
                hasPrev: !!(lastId && lastValue !== undefined),
                nextCursor: lastItem?.id,
                nextKeyValue: lastItem?.[keyField]
            }
        };
    }

    /**
     * Get page info for UI
     */
    getPageInfo(
        currentPage: number,
        totalPages: number,
        maxVisible: number = 7
    ): {
        pages: (number | 'ellipsis')[];
        showFirst: boolean;
        showLast: boolean;
    } {
        const pages: (number | 'ellipsis')[] = [];

        if (totalPages <= maxVisible) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return { pages, showFirst: false, showLast: false };
        }

        // Always show first page
        pages.push(1);

        // Calculate visible range around current page
        const halfVisible = Math.floor((maxVisible - 4) / 2);
        let start = Math.max(2, currentPage - halfVisible);
        let end = Math.min(totalPages - 1, currentPage + halfVisible);

        // Adjust if near start or end
        if (currentPage <= halfVisible + 2) {
            end = maxVisible - 2;
        } else if (currentPage >= totalPages - halfVisible - 1) {
            start = totalPages - maxVisible + 3;
        }

        // Add ellipsis if needed
        if (start > 2) {
            pages.push('ellipsis');
        }

        // Add middle pages
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // Add ellipsis if needed
        if (end < totalPages - 1) {
            pages.push('ellipsis');
        }

        // Always show last page
        pages.push(totalPages);

        return {
            pages,
            showFirst: currentPage > 1,
            showLast: currentPage < totalPages
        };
    }

    /**
     * Calculate skip/take for offset pagination
     */
    static calculateOffset(page: number, limit: number): { skip: number; take: number; } {
        return {
            skip: (Math.max(1, page) - 1) * limit,
            take: limit
        };
    }

    /**
     * Build pagination response
     */
    static buildResponse<T>(
        data: T[],
        total: number,
        page: number,
        limit: number
    ): PaginatedResult<T> {
        const totalPages = Math.ceil(total / limit);
        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Parse pagination params from URL
     */
    static parseParams(query: Record<string, any>): PaginationParams {
        const strategy = (query.strategy || 'offset') as PaginationStrategy;
        const limit = parseInt(query.limit || query.pageSize || '20', 10);

        switch (strategy) {
            case 'cursor':
                return {
                    strategy: 'cursor',
                    cursor: query.cursor,
                    limit,
                    direction: query.direction || 'forward'
                };
            case 'keyset':
                return {
                    strategy: 'keyset',
                    lastId: query.lastId,
                    lastValue: query.lastValue,
                    keyField: query.keyField || 'createdAt',
                    limit
                };
            case 'offset':
            default:
                return {
                    strategy: 'offset',
                    page: parseInt(query.page || '1', 10),
                    limit
                };
        }
    }

    /**
     * Generate URL params for next/prev page
     */
    static generateUrlParams(
        current: PaginationParams,
        meta: PaginationMeta,
        direction: 'next' | 'prev'
    ): Record<string, string> {
        const params: Record<string, string> = {
            limit: meta.limit.toString()
        };

        if (current.strategy === 'offset') {
            const page = (current as OffsetPaginationParams).page;
            params.page = direction === 'next'
                ? (page + 1).toString()
                : (page - 1).toString();
        } else if (current.strategy === 'cursor') {
            params.strategy = 'cursor';
            params.cursor = direction === 'next'
                ? meta.nextCursor || ''
                : meta.prevCursor || '';
            params.direction = direction === 'next' ? 'forward' : 'backward';
        } else if (current.strategy === 'keyset') {
            params.strategy = 'keyset';
            params.keyField = (current as KeysetPaginationParams).keyField;
            if (direction === 'next' && meta.nextCursor) {
                params.lastId = meta.nextCursor;
                params.lastValue = String(meta.nextKeyValue);
            }
        }

        return params;
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let paginationEngineInstance: UnifiedPaginationEngine | null = null;

export function getPaginationEngine(config?: Partial<PaginationConfig>): UnifiedPaginationEngine {
    if (!paginationEngineInstance) {
        paginationEngineInstance = new UnifiedPaginationEngine(config);
    }
    return paginationEngineInstance;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Simple offset pagination helper
 */
export async function paginateOffset<T>(
    model: any,
    page: number,
    limit: number,
    options: {
        where?: any;
        orderBy?: any;
        select?: any;
        include?: any;
    } = {}
): Promise<PaginatedResult<T>> {
    const engine = getPaginationEngine();
    return engine.paginate<T>(model, { strategy: 'offset', page, limit }, options);
}

/**
 * Simple cursor pagination helper
 */
export async function paginateCursor<T>(
    model: any,
    cursor: string | undefined,
    limit: number,
    options: {
        where?: any;
        orderBy?: any;
        select?: any;
        include?: any;
    } = {}
): Promise<PaginatedResult<T>> {
    const engine = getPaginationEngine();
    return engine.paginate<T>(model, { strategy: 'cursor', cursor, limit }, options);
}

// ============================================
// EXPORTS
// ============================================

export default UnifiedPaginationEngine;
