/**
 * API لحفظ وجلب إعدادات المزادات
 * يحفظ في ملف JSON ليتم قراءتها من جميع أجزاء النظام
 */

import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getBlobPublicUrl, putBufferToBlobPathname } from '../../../../lib/blob';

// مسار ملف الإعدادات - يحاول عدة مسارات للتوافق
function getSettingsFilePath(): string {
    // محاولة المسار من apps/admin
    const pathFromAdmin = path.join(process.cwd(), '..', 'web', 'data', 'auction-settings.json');
    // محاولة المسار من الجذر
    const pathFromRoot = path.join(process.cwd(), 'apps', 'web', 'data', 'auction-settings.json');
    // محاولة المسار المباشر
    const directPath = path.join(process.cwd(), 'data', 'auction-settings.json');

    // إرجاع المسار الموجود أو الأول كـ default
    if (fs.existsSync(path.dirname(pathFromAdmin))) return pathFromAdmin;
    if (fs.existsSync(path.dirname(pathFromRoot))) return pathFromRoot;
    if (fs.existsSync(path.dirname(directPath))) return directPath;

    return pathFromRoot; // الافتراضي
}

const SETTINGS_FILE = getSettingsFilePath();
const DATA_DIR = path.dirname(SETTINGS_FILE);

const SETTINGS_BLOB_PATHNAME = 'config/auction-settings.json';

async function readSettingsFromBlob(): Promise<any | null> {
    const url = await getBlobPublicUrl(SETTINGS_BLOB_PATHNAME);
    if (!url) return null;

    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
}

async function writeSettingsToBlob(settings: any): Promise<void> {
    const buffer = Buffer.from(JSON.stringify(settings, null, 2), 'utf-8');
    await putBufferToBlobPathname({
        pathname: SETTINGS_BLOB_PATHNAME,
        buffer,
        contentType: 'application/json',
    });
}

// خيارات وقت بداية المزاد الافتراضية
interface StartTimeOption {
    id: string;
    label: string;
    description: string;
    value: string;
    enabled: boolean;
    order: number;
}

// جميع خيارات وقت البداية المتاحة
const ALL_START_TIME_OPTIONS: StartTimeOption[] = [
    {
        id: 'now',
        label: 'مزاد مباشر',
        description: 'يبدأ المزاد فوراً',
        value: 'now',
        enabled: true,
        order: 1,
    },
    {
        id: 'after_30_seconds',
        label: 'بعد 30 ثانية',
        description: 'يبدأ المزاد بعد 30 ثانية من النشر',
        value: 'after_30_seconds',
        enabled: true,
        order: 2,
    },
    {
        id: 'after_1_hour',
        label: 'بعد ساعة',
        description: 'يبدأ المزاد بعد ساعة واحدة',
        value: 'after_1_hour',
        enabled: true,
        order: 3,
    },
    {
        id: 'after_24_hours',
        label: 'بعد 24 ساعة',
        description: 'يبدأ المزاد بعد يوم كامل',
        value: 'after_24_hours',
        enabled: true,
        order: 4,
    },
    {
        id: 'after_3_days',
        label: 'بعد 3 أيام',
        description: 'يبدأ المزاد بعد 3 أيام',
        value: 'after_3_days',
        enabled: false,
        order: 5,
    },
    {
        id: 'after_7_days',
        label: 'بعد أسبوع',
        description: 'يبدأ المزاد بعد أسبوع كامل',
        value: 'after_7_days',
        enabled: false,
        order: 6,
    },
    {
        id: 'custom',
        label: 'مخصص',
        description: 'حدد وقت بداية المزاد بنفسك',
        value: 'custom',
        enabled: true,
        order: 99,
    },
];

// القيم الافتراضية للإعدادات
const DEFAULT_SETTINGS = {
    minStartingPrice: 1000,
    minBidIncrement: 500,
    autoExtendTime: 5,
    maxImagesPerAuction: 10,
    durationConfig: {
        minDuration: { type: 'preset', presetId: '1_hour', totalMinutes: 60 },
        maxDuration: { type: 'preset', presetId: '30_days', totalMinutes: 43200 },
        defaultDuration: { type: 'preset', presetId: '7_days', totalMinutes: 10080 },
    },
    // إعدادات وقت بداية المزاد
    startTimeOptions: ALL_START_TIME_OPTIONS,
    defaultStartTimeOption: 'now',
    allowCustomStartTime: true,
    // إعدادات إضافية للتوافق مع auction-settings-loader
    defaultStartTime: 'now',
    defaultDuration: '1_week',
    minimumBidIncrement: 500,
    minimumStartingPrice: 1000,
    defaultStartPriceFactor: 0.70,
    startFactorNew: 0.85,
    startFactorUsed: 0.70,
    startFactorNeedsRepair: 0.55,
    startFactorSUV: 0.75,
    startFactorSedan: 0.70,
    startFactorPickup: 0.65,
    startFactorVan: 0.60,
    allowFeaturedAuctions: true,
    featuredAuctionDuration: 7,
};

interface ApiResponse {
    success: boolean;
    message?: string;
    data?: typeof DEFAULT_SETTINGS;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    // التحقق من المصادقة
    const adminSession = req.cookies['admin_session'];
    if (!adminSession) {
        console.log('[Auctions Settings] لا توجد جلسة مدير - cookies:', Object.keys(req.cookies));
        return res.status(401).json({
            success: false,
            error: 'غير مصرح - يرجى تسجيل الدخول',
        });
    }

    if (req.method === 'GET') {
        // جلب الإعدادات الحالية
        try {
            let settings = DEFAULT_SETTINGS;

            if (process.env.NODE_ENV !== 'development') {
                const savedSettings = await readSettingsFromBlob();
                if (savedSettings) {
                    settings = { ...DEFAULT_SETTINGS, ...savedSettings };
                }
            } else if (fs.existsSync(SETTINGS_FILE)) {
                const fileContent = fs.readFileSync(SETTINGS_FILE, 'utf-8');
                const savedSettings = JSON.parse(fileContent);
                settings = { ...DEFAULT_SETTINGS, ...savedSettings };
            }

            return res.status(200).json({
                success: true,
                data: settings,
            });
        } catch (error) {
            console.error('خطأ في قراءة الإعدادات:', error);
            return res.status(200).json({
                success: true,
                data: DEFAULT_SETTINGS,
            });
        }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
        // حفظ الإعدادات
        try {
            const newSettings = req.body;

            // التحقق من البيانات المطلوبة
            if (!newSettings) {
                return res.status(400).json({
                    success: false,
                    error: 'البيانات مطلوبة',
                });
            }

            // دمج الإعدادات الجديدة مع القديمة
            let existingSettings = DEFAULT_SETTINGS;

            if (process.env.NODE_ENV !== 'development') {
                const savedSettings = await readSettingsFromBlob();
                if (savedSettings) {
                    existingSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
                }
            } else if (fs.existsSync(SETTINGS_FILE)) {
                try {
                    const fileContent = fs.readFileSync(SETTINGS_FILE, 'utf-8');
                    existingSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(fileContent) };
                } catch {
                    // استخدام الافتراضي إذا فشلت القراءة
                }
            }

            // تحديث الإعدادات
            const updatedSettings = {
                ...existingSettings,
                ...newSettings,
                // تحديث الحقول المتوافقة مع auction-settings-loader
                minimumBidIncrement: newSettings.minBidIncrement || existingSettings.minBidIncrement,
                minimumStartingPrice: newSettings.minStartingPrice || existingSettings.minStartingPrice,
                updatedAt: new Date().toISOString(),
            };

            if (process.env.NODE_ENV !== 'development') {
                await writeSettingsToBlob(updatedSettings);
            } else {
                // التأكد من وجود المجلد
                if (!fs.existsSync(DATA_DIR)) {
                    fs.mkdirSync(DATA_DIR, { recursive: true });
                }

                // حفظ في الملف
                fs.writeFileSync(
                    SETTINGS_FILE,
                    JSON.stringify(updatedSettings, null, 2),
                    'utf-8'
                );
            }

            console.log('[Admin] تم حفظ إعدادات المزادات:', {
                minStartingPrice: updatedSettings.minStartingPrice,
                minBidIncrement: updatedSettings.minBidIncrement,
                autoExtendTime: updatedSettings.autoExtendTime,
                updatedAt: updatedSettings.updatedAt,
            });

            return res.status(200).json({
                success: true,
                message: 'تم حفظ الإعدادات بنجاح',
                data: updatedSettings,
            });
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات:', error);
            return res.status(500).json({
                success: false,
                error: 'حدث خطأ في حفظ الإعدادات',
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: 'Method not allowed',
    });
}
