import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_BRANDING_SETTINGS = {
  logoType: 'text' as 'text' | 'image',
  logoImageUrl: '',
  siteName: 'سوق المزاد',
  siteDescription: 'منصة المزادات الأولى في ليبيا',
  showLogoInNavbar: true,
  showSiteNameInNavbar: true,
};

const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

type BrandingSettings = typeof DEFAULT_BRANDING_SETTINGS;

async function verifyAuth(
  req: NextApiRequest,
): Promise<{ adminId: string; role: string; } | null> {
  const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
  if (!token) return null;

  try {
    const decoded = (await import('jsonwebtoken')).default.verify(token, JWT_SECRET) as {
      adminId: string;
      role: string;
      type: string;
    };
    if (decoded.type !== 'admin') return null;
    return { adminId: decoded.adminId, role: decoded.role };
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      try {
        const record = await prisma.system_settings.findFirst({
          where: { key: 'site_branding' },
        });

        if (!record || !record.value) {
          return res.status(200).json({
            success: true,
            settings: DEFAULT_BRANDING_SETTINGS,
          });
        }

        const value =
          typeof record.value === 'string' ? JSON.parse(record.value) : (record.value as BrandingSettings);

        return res.status(200).json({
          success: true,
          settings: {
            ...DEFAULT_BRANDING_SETTINGS,
            ...value,
          },
        });
      } catch {
        return res.status(200).json({
          success: true,
          settings: DEFAULT_BRANDING_SETTINGS,
        });
      }
    }

    if (req.method === 'PUT') {
      const auth = await verifyAuth(req);
      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (!auth && !isDevelopment) {
        return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
      }

      const body = req.body as Partial<BrandingSettings> | undefined;

      if (!body || typeof body !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'بيانات الإعدادات غير صحيحة',
        });
      }

      const newSettings: BrandingSettings = {
        ...DEFAULT_BRANDING_SETTINGS,
        ...body,
      };

      await prisma.system_settings.upsert({
        where: { key: 'site_branding' },
        create: {
          key: 'site_branding',
          value: JSON.stringify(newSettings),
        },
        update: {
          value: JSON.stringify(newSettings),
        },
      });

      return res.status(200).json({
        success: true,
        message: 'تم حفظ إعدادات الهوية البصرية بنجاح',
        settings: newSettings,
      });
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

