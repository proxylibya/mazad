import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET =
    process.env.ADMIN_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

const SITE_TEAM_USER_ID = 'site_team';

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

async function ensureSiteTeamUserExists() {
    const existing = await prisma.users.findUnique({ where: { id: SITE_TEAM_USER_ID } });
    if (existing) return;

    let phoneToUse = `+2189${Date.now().toString().slice(-9)}`;
    for (let i = 0; i < 10; i += 1) {
        const occupied = await prisma.users.findFirst({ where: { phone: phoneToUse }, select: { id: true } });
        if (!occupied) break;
        phoneToUse = `+2189${Date.now().toString().slice(-9)}`;
    }

    await prisma.users.create({
        data: {
            id: SITE_TEAM_USER_ID,
            name: 'فريق مزاد',
            phone: phoneToUse,
            role: 'USER',
            status: 'ACTIVE',
            accountType: 'REGULAR_USER',
            verified: true,
            updatedAt: new Date(),
            createdAt: new Date(),
        },
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        await ensureSiteTeamUserExists();

        if (req.method === 'GET') {
            const conversationId =
                typeof req.query.conversationId === 'string' ? req.query.conversationId : undefined;

            if (conversationId) {
                const conv = await prisma.conversations.findFirst({
                    where: {
                        id: conversationId,
                        conversation_participants: { some: { userId: SITE_TEAM_USER_ID } },
                    },
                    select: { id: true },
                });

                if (!conv) {
                    return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
                }

                const messages = await prisma.messages.findMany({
                    where: { conversationId },
                    orderBy: { createdAt: 'asc' },
                    take: 200,
                    select: {
                        id: true,
                        content: true,
                        senderId: true,
                        createdAt: true,
                        status: true,
                        type: true,
                        users: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                profileImage: true,
                            },
                        },
                    },
                });

                await prisma.conversation_participants.updateMany({
                    where: { conversationId, userId: SITE_TEAM_USER_ID },
                    data: { lastReadAt: new Date() },
                });

                return res.status(200).json({ success: true, messages });
            }

            const conversations = await prisma.conversations.findMany({
                where: {
                    conversation_participants: { some: { userId: SITE_TEAM_USER_ID } },
                },
                orderBy: { lastMessageAt: 'desc' },
                take: 100,
                select: {
                    id: true,
                    title: true,
                    type: true,
                    carId: true,
                    auctionId: true,
                    transportServiceId: true,
                    lastMessageAt: true,
                    createdAt: true,
                    updatedAt: true,
                    conversation_participants: {
                        select: {
                            userId: true,
                            lastReadAt: true,
                            role: true,
                            users: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                    profileImage: true,
                                },
                            },
                        },
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            content: true,
                            createdAt: true,
                            senderId: true,
                            type: true,
                            status: true,
                            users: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                    profileImage: true,
                                },
                            },
                        },
                    },
                },
            });

            return res.status(200).json({ success: true, conversations });
        }

        if (req.method === 'POST') {
            const { conversationId, content } = req.body as { conversationId?: string; content?: string; };

            if (!conversationId || typeof conversationId !== 'string') {
                return res.status(400).json({ success: false, message: 'conversationId مطلوب' });
            }

            if (!content || typeof content !== 'string' || !content.trim()) {
                return res.status(400).json({ success: false, message: 'نص الرسالة مطلوب' });
            }

            const conv = await prisma.conversations.findFirst({
                where: {
                    id: conversationId,
                    conversation_participants: { some: { userId: SITE_TEAM_USER_ID } },
                },
                select: { id: true },
            });

            if (!conv) {
                return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
            }

            const messageId = `msg_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

            const message = await prisma.messages.create({
                data: {
                    id: messageId,
                    content: content.trim(),
                    senderId: SITE_TEAM_USER_ID,
                    conversationId,
                    type: 'TEXT',
                    status: 'SENT',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                select: {
                    id: true,
                    content: true,
                    senderId: true,
                    createdAt: true,
                    status: true,
                    type: true,
                    users: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            profileImage: true,
                        },
                    },
                },
            });

            await prisma.conversations.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date(), updatedAt: new Date() },
            });

            await prisma.conversation_participants.updateMany({
                where: { conversationId, userId: SITE_TEAM_USER_ID },
                data: { lastReadAt: new Date() },
            });

            return res.status(200).json({ success: true, message });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        });
    }
}
