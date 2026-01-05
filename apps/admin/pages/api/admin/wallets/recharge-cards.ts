/**
 * API إدارة كروت الشحن - ليبيانا ومدار
 * Recharge Cards Management API
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';
const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || 'sooq-mazad-card-encryption-32ch';

// تشفير رقم الكرت
function encryptCardNumber(cardNumber: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let encrypted = cipher.update(cardNumber, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// فك تشفير رقم الكرت
function decryptCardNumber(encryptedCard: string): string {
    try {
        const [ivHex, encrypted] = encryptedCard.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return '';
    }
}

// إنشاء hash للكرت للبحث السريع
function hashCardNumber(cardNumber: string): string {
    return crypto.createHash('sha256').update(cardNumber).digest('hex');
}

async function verifyAuth(req: NextApiRequest): Promise<{ adminId: string; role: string; } | null> {
    const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; role: string; type: string; };
        if (decoded.type !== 'admin') return null;
        return { adminId: decoded.adminId, role: decoded.role };
    } catch {
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        // فقط SUPER_ADMIN و ADMIN و FINANCE يمكنهم إدارة الكروت
        if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(auth.role)) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية إدارة الكروت' });
        }

        switch (req.method) {
            case 'GET':
                return handleGet(req, res, auth);
            case 'POST':
                return handlePost(req, res, auth);
            case 'DELETE':
                return handleDelete(req, res, auth);
            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Recharge Cards API error:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
}

// الحصول على قائمة الكروت
async function handleGet(req: NextApiRequest, res: NextApiResponse, auth: { adminId: string; role: string; }) {
    const { provider, status, batchId, page = '1', limit = '20' } = req.query;

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (provider && provider !== 'ALL') {
            where.provider = provider;
        }
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (batchId) {
            where.batchId = batchId;
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [cards, total] = await Promise.all([
            prisma.recharge_cards.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit as string),
            }),
            prisma.recharge_cards.count({ where }),
        ]);

        // إحصائيات
        const stats = await prisma.$queryRaw`
      SELECT 
        provider,
        status,
        COUNT(*) as count,
        SUM(value) as total_value
      FROM recharge_cards
      GROUP BY provider, status
    ` as any[];

        // تحويل الكروت مع إخفاء الأرقام الكاملة
        const mappedCards = cards.map(card => ({
            id: card.id,
            cardNumberMasked: '****' + decryptCardNumber(card.cardNumber).slice(-4),
            provider: card.provider,
            denomination: card.denomination,
            value: card.value,
            status: card.status,
            batchId: card.batchId,
            serialNumber: card.serialNumber,
            usedBy: card.usedBy,
            usedAt: card.usedAt,
            expiresAt: card.expiresAt,
            createdAt: card.createdAt,
        }));

        // حساب الإحصائيات
        const statsMap = {
            LIBYANA: { available: 0, used: 0, totalValue: 0, usedValue: 0 },
            MADAR: { available: 0, used: 0, totalValue: 0, usedValue: 0 },
        };

        stats.forEach((s: any) => {
            const provider = s.provider as 'LIBYANA' | 'MADAR';
            if (statsMap[provider]) {
                if (s.status === 'AVAILABLE') {
                    statsMap[provider].available = Number(s.count);
                    statsMap[provider].totalValue = Number(s.total_value);
                } else if (s.status === 'USED') {
                    statsMap[provider].used = Number(s.count);
                    statsMap[provider].usedValue = Number(s.total_value);
                }
            }
        });

        return res.status(200).json({
            success: true,
            cards: mappedCards,
            total,
            page: parseInt(page as string),
            pages: Math.ceil(total / parseInt(limit as string)),
            stats: statsMap,
        });
    } catch (error) {
        console.error('Error fetching cards:', error);
        return res.status(500).json({ success: false, message: 'خطأ في جلب الكروت' });
    }
}

// إضافة كروت جديدة
async function handlePost(req: NextApiRequest, res: NextApiResponse, auth: { adminId: string; role: string; }) {
    const { cards, provider, batchNumber, notes } = req.body;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ success: false, message: 'يجب توفير قائمة الكروت' });
    }

    if (!provider || !['LIBYANA', 'MADAR'].includes(provider)) {
        return res.status(400).json({ success: false, message: 'يجب تحديد مزود الخدمة (LIBYANA أو MADAR)' });
    }

    try {
        // إنشاء دفعة جديدة
        const batch = await prisma.card_batches.create({
            data: {
                batchNumber: batchNumber || `BATCH-${Date.now()}`,
                provider,
                totalCards: cards.length,
                totalValue: cards.reduce((sum: number, c: any) => sum + (c.value || c.denomination), 0),
                addedBy: auth.adminId,
                notes,
            },
        });

        // إضافة الكروت
        const createdCards = [];
        const errors = [];

        for (const card of cards) {
            const cardNumber = card.cardNumber?.replace(/\s/g, '');
            const denomination = card.denomination || card.value;
            const value = card.value || card.denomination;

            if (!cardNumber || cardNumber.length < 10) {
                errors.push({ cardNumber: cardNumber?.slice(-4) || 'غير صالح', error: 'رقم كرت غير صالح' });
                continue;
            }

            const cardHash = hashCardNumber(cardNumber);

            // التحقق من عدم وجود الكرت مسبقاً
            const existing = await prisma.recharge_cards.findUnique({
                where: { cardHash },
            });

            if (existing) {
                errors.push({ cardNumber: '****' + cardNumber.slice(-4), error: 'الكرت موجود مسبقاً' });
                continue;
            }

            try {
                const newCard = await prisma.recharge_cards.create({
                    data: {
                        cardNumber: encryptCardNumber(cardNumber),
                        cardHash,
                        provider,
                        denomination,
                        value,
                        batchId: batch.id,
                        serialNumber: card.serialNumber,
                        addedBy: auth.adminId,
                        expiresAt: card.expiresAt ? new Date(card.expiresAt) : null,
                    },
                });
                createdCards.push(newCard.id);
            } catch (e) {
                errors.push({ cardNumber: '****' + cardNumber.slice(-4), error: 'خطأ في الإضافة' });
            }
        }

        // تحديث عدد الكروت في الدفعة
        await prisma.card_batches.update({
            where: { id: batch.id },
            data: { totalCards: createdCards.length },
        });

        return res.status(201).json({
            success: true,
            message: `تم إضافة ${createdCards.length} كرت بنجاح`,
            batchId: batch.id,
            addedCount: createdCards.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error('Error adding cards:', error);
        return res.status(500).json({ success: false, message: 'خطأ في إضافة الكروت' });
    }
}

// حذف كرت
async function handleDelete(req: NextApiRequest, res: NextApiResponse, auth: { adminId: string; role: string; }) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, message: 'معرف الكرت مطلوب' });
    }

    try {
        const card = await prisma.recharge_cards.findUnique({
            where: { id: id as string },
        });

        if (!card) {
            return res.status(404).json({ success: false, message: 'الكرت غير موجود' });
        }

        if (card.status === 'USED') {
            return res.status(400).json({ success: false, message: 'لا يمكن حذف كرت مستخدم' });
        }

        await prisma.recharge_cards.delete({
            where: { id: id as string },
        });

        return res.status(200).json({ success: true, message: 'تم حذف الكرت بنجاح' });
    } catch (error) {
        console.error('Error deleting card:', error);
        return res.status(500).json({ success: false, message: 'خطأ في حذف الكرت' });
    }
}
