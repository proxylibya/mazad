import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

type ThemeMode = 'light' | 'dark' | 'system';
type AnimationMode = 'normal' | 'disabled';
type LayoutWidth = 'normal' | 'wide' | 'full';
type FontScale = 'sm' | 'md' | 'lg';

const DEFAULT_THEME_SETTINGS = {
  mode: 'system' as ThemeMode,
  primaryColor: '',
  backgroundColor: '',
  accentColor: '',
  animations: 'normal' as AnimationMode,
  textColor: '',
  fontScale: 'md' as FontScale,
  layoutWidth: 'normal' as LayoutWidth,
};

type ThemeSettings = typeof DEFAULT_THEME_SETTINGS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const record = await prisma.system_settings.findFirst({
      where: { key: 'site_theme' },
    });

    if (!record || !record.value) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({
        success: true,
        settings: DEFAULT_THEME_SETTINGS,
      });
    }

    const value =
      typeof record.value === 'string' ? JSON.parse(record.value as string) : (record.value as ThemeSettings);

    const settings: ThemeSettings = {
      ...DEFAULT_THEME_SETTINGS,
      ...value,
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      success: true,
      settings: DEFAULT_THEME_SETTINGS,
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
}
