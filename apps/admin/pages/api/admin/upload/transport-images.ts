/**
 * API رفع صور خدمات النقل - لوحة التحكم
 * Upload Transport Service Images API - Admin Panel
 */

import formidable from 'formidable';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import { uploadBufferToBlob } from '../../../../lib/blob';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// تعطيل body parser الافتراضي
export const config = {
    api: {
        bodyParser: false,
    },
};

// Verify admin authentication
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
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // التحقق من المصادقة
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
        }

        const tempDir = path.join(os.tmpdir(), 'sooq-mazad', 'admin', 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // إعداد formidable
        const form = formidable({
            uploadDir: tempDir,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            filter: (part) => {
                return part.mimetype?.startsWith('image/') || false;
            },
        });

        // معالجة الملف
        const [, files] = await form.parse(req);

        const imageFile = files.image?.[0];
        if (!imageFile) {
            return res.status(400).json({ success: false, message: 'لم يتم رفع صورة' });
        }

        // التحقق من نوع الملف
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!imageFile.mimetype || !allowedTypes.includes(imageFile.mimetype)) {
            // حذف الملف غير المسموح
            fs.unlinkSync(imageFile.filepath);
            return res.status(400).json({ success: false, message: 'نوع الملف غير مدعوم' });
        }

        // إعادة تسمية الملف بتنسيق موحد
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(imageFile.originalFilename || '.jpg');
        const newFileName = `transport_${timestamp}_${randomStr}${ext}`;

        const buffer = await fs.promises.readFile(imageFile.filepath);
        const contentType = imageFile.mimetype || 'application/octet-stream';
        const uploaded = await uploadBufferToBlob({
            buffer,
            filename: newFileName,
            contentType,
            folder: 'uploads/transport',
        });
        await fs.promises.unlink(imageFile.filepath).catch(() => { });

        const imageUrl = uploaded.url;

        return res.status(200).json({
            success: true,
            message: 'تم رفع الصورة بنجاح',
            imageUrl,
            url: imageUrl,
        });
    } catch (error) {
        console.error('خطأ في رفع صورة النقل:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في رفع الصورة',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
