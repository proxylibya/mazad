import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

const DEFAULT_SECURITY_SETTINGS = {
  login: {
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    requireTwoFactorForAdmins: true,
    allowRememberDevice: true,
    loginAlerts: true,
  },
  password: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: true,
    expiryEnabled: false,
    expiryDays: 90,
  },
  session: {
    adminSessionHours: 8,
    idleTimeoutMinutes: 30,
    maxConcurrentSessions: 5,
    notifyOnNewDevice: true,
  },
  monitoring: {
    failedLoginAlertThreshold: 5,
    suspiciousActivityThreshold: 10,
    autoBlockIp: true,
    autoBlockIpThreshold: 10,
  },
} as const;

type SecuritySettings = typeof DEFAULT_SECURITY_SETTINGS;

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
          where: { key: 'admin_security_settings' },
        });

        if (!record || !record.value) {
          return res.status(200).json({
            success: true,
            settings: DEFAULT_SECURITY_SETTINGS,
          });
        }

        const raw =
          typeof record.value === 'string'
            ? (JSON.parse(record.value) as Partial<SecuritySettings>)
            : (record.value as Partial<SecuritySettings>);

        const settings: SecuritySettings = {
          login: {
            ...DEFAULT_SECURITY_SETTINGS.login,
            ...(raw.login || {}),
          },
          password: {
            ...DEFAULT_SECURITY_SETTINGS.password,
            ...(raw.password || {}),
          },
          session: {
            ...DEFAULT_SECURITY_SETTINGS.session,
            ...(raw.session || {}),
          },
          monitoring: {
            ...DEFAULT_SECURITY_SETTINGS.monitoring,
            ...(raw.monitoring || {}),
          },
        };

        return res.status(200).json({
          success: true,
          settings,
        });
      } catch {
        return res.status(200).json({
          success: true,
          settings: DEFAULT_SECURITY_SETTINGS,
        });
      }
    }

    if (req.method === 'PUT') {
      const auth = await verifyAuth(req);
      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (!auth && !isDevelopment) {
        return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
      }

      if (auth && auth.role !== 'SUPER_ADMIN') {
        return res
          .status(403)
          .json({ success: false, message: 'ليس لديك صلاحية تعديل إعدادات الأمان' });
      }

      const body = req.body as Partial<SecuritySettings> | undefined;

      if (!body || typeof body !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'بيانات الإعدادات غير صحيحة',
        });
      }

      const newSettings: SecuritySettings = {
        login: {
          ...DEFAULT_SECURITY_SETTINGS.login,
          ...(body.login || {}),
        },
        password: {
          ...DEFAULT_SECURITY_SETTINGS.password,
          ...(body.password || {}),
        },
        session: {
          ...DEFAULT_SECURITY_SETTINGS.session,
          ...(body.session || {}),
        },
        monitoring: {
          ...DEFAULT_SECURITY_SETTINGS.monitoring,
          ...(body.monitoring || {}),
        },
      };

      await prisma.system_settings.upsert({
        where: { key: 'admin_security_settings' },
        create: {
          key: 'admin_security_settings',
          value: JSON.stringify(newSettings),
        },
        update: {
          value: JSON.stringify(newSettings),
        },
      });

      return res.status(200).json({
        success: true,
        message: 'تم حفظ إعدادات الأمان بنجاح',
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

