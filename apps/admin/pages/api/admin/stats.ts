/**
 * Admin Stats API - Enterprise Edition
 * API إحصائيات لوحة التحكم - من قاعدة البيانات الحقيقية
 * 
 * Features:
 * - Real-time stats from PostgreSQL
 * - Cached responses for performance
 * - Protected endpoint
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// Simple in-memory cache
let statsCache: { data: unknown; timestamp: number; } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute cache

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Verify admin authentication
        const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
        if (!token) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { type: string; };
            if (decoded.type !== 'admin') {
                return res.status(401).json({ success: false, message: 'غير مصرح' });
            }
        } catch {
            return res.status(401).json({ success: false, message: 'رمز غير صالح' });
        }

        // Check cache
        if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
            return res.status(200).json(statsCache.data);
        }

        // Fetch real stats from database
        const [users, auctions, transport, showrooms, wallets, admins] = await Promise.all([
            // Users stats
            prisma.users.aggregate({
                _count: true,
                where: { isDeleted: false },
            }),
            // Auctions stats
            prisma.auctions.groupBy({
                by: ['status'],
                _count: true,
            }),
            // Transport services
            prisma.transport_services.count(),
            // Showrooms
            prisma.showrooms.count({
                where: { status: 'ACTIVE' },
            }),
            // Wallets
            prisma.wallets.count(),
            // Admins
            prisma.admins.count({
                where: { is_active: true, deleted_at: null },
            }),
        ]);

        // Calculate auction stats
        const auctionsByStatus = auctions.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
        }, {} as Record<string, number>);

        const totalAuctions = Object.values(auctionsByStatus).reduce((a, b) => a + b, 0);
        const activeAuctions = auctionsByStatus['ACTIVE'] || 0;
        const pendingAuctions = auctionsByStatus['PENDING'] || 0;
        const completedAuctions = auctionsByStatus['COMPLETED'] || 0;

        // Get revenue stats (from transactions)
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
            prisma.transactions.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'COMPLETED',
                    type: 'DEPOSIT',
                    createdAt: { gte: todayStart },
                },
            }),
            prisma.transactions.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'COMPLETED',
                    type: 'DEPOSIT',
                    createdAt: { gte: weekStart },
                },
            }),
            prisma.transactions.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'COMPLETED',
                    type: 'DEPOSIT',
                    createdAt: { gte: monthStart },
                },
            }),
        ]);

        // Get cars stats
        const [totalCars, availableCars] = await Promise.all([
            prisma.cars.count(),
            prisma.cars.count({ where: { status: 'AVAILABLE' } }),
        ]);

        const stats = {
            // Main counts
            totalUsers: users._count,
            totalAuctions,
            totalTransport: transport,
            totalShowrooms: showrooms,
            totalWallets: wallets,
            totalAdmins: admins,
            totalCars,
            availableCars,

            // Auction breakdown
            activeAuctions,
            pendingAuctions,
            completedAuctions,

            // Revenue
            todayRevenue: todayRevenue._sum.amount || 0,
            weekRevenue: weekRevenue._sum.amount || 0,
            monthRevenue: monthRevenue._sum.amount || 0,
            totalRevenue: monthRevenue._sum.amount || 0,

            // Metadata
            lastUpdated: new Date().toISOString(),
        };

        // Update cache
        statsCache = { data: stats, timestamp: Date.now() };

        return res.status(200).json(stats);

    } catch (error) {
        console.error('Stats API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب الإحصائيات'
        });
    }
}
