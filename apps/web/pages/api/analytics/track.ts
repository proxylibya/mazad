import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import viewsService, { getLocationFromIP, parseUserAgent } from '../../../lib/services/unified/viewsService';

// أنواع الأحداث المدعومة من Prisma EventType enum
type PrismaEventType = 'PAGE_VIEW' | 'USER_ACTION' | 'CONVERSION' | 'ERROR' | 'PERFORMANCE' | 'CUSTOM';

interface TrackingData {
  eventType: string; // نقبل أي نوع من العميل ونحوله للنوع الصحيح
  eventName: string;
  category?: string;
  label?: string;
  value?: number;
  page?: string;
  referrer?: string;
  properties?: any;
}

// تحويل نوع الحدث للنوع المدعوم في Prisma
function mapEventType(eventType: string): PrismaEventType {
  const typeMap: Record<string, PrismaEventType> = {
    'PAGE_VIEW': 'PAGE_VIEW',
    'CLICK': 'USER_ACTION',
    'SCROLL': 'USER_ACTION',
    'FORM_SUBMIT': 'CONVERSION',
    'SEARCH': 'USER_ACTION',
    'DOWNLOAD': 'USER_ACTION',
    'PURCHASE': 'CONVERSION',
    'BID': 'CONVERSION',
    'VIEW': 'USER_ACTION',
  };
  return typeMap[eventType] || 'CUSTOM';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const trackingData: TrackingData = req.body;

    // Validate required fields
    if (!trackingData.eventType || !trackingData.eventName) {
      return res.status(400).json({
        success: false,
        error: 'eventType and eventName are required',
      });
    }

    // Get user info from token (optional)
    let userId: string | null = null;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production') as any;
        userId = decoded.id || decoded.userId;
      } catch (error) {
        // Token invalid but continue without user ID
      }
    }

    // Generate session ID from headers
    const sessionId =
      (req.headers['x-session-id'] as string) ||
      (req.headers['x-forwarded-for'] as string) ||
      req.connection.remoteAddress ||
      'anonymous';

    // Parse user agent
    const userAgent = req.headers['user-agent'] || '';
    const { browser, os, device } = parseUserAgent(userAgent);

    // Get location
    const clientIP =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.connection.remoteAddress ||
      '127.0.0.1';
    const { country, city } = getLocationFromIP(clientIP);

    // Save analytics event with mapped event type
    const mappedEventType = mapEventType(trackingData.eventType);
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const analyticsEvent = await prisma.analytics_events.create({
      data: {
        id: eventId,
        sessionId,
        eventType: mappedEventType as any,
        eventName: trackingData.eventName,
        category: trackingData.category,
        label: trackingData.label,
        value: trackingData.value,
        properties: trackingData.properties ?? null,
        page: trackingData.page,
        referrer: trackingData.referrer,
        browser,
        os,
        device,
        country,
        city,
        // ربط المستخدم عبر العلاقة إذا كان موجوداً
        ...(userId ? { users: { connect: { id: userId } } } : {}),
      },
    });

    // Update specific content views if this is a view event
    if (trackingData.eventType === 'VIEW' || trackingData.eventType === 'PAGE_VIEW') {
      await updateContentViews(trackingData, analyticsEvent.id);
    }

    return res.status(200).json({
      success: true,
      eventId: analyticsEvent.id,
      message: 'Event tracked successfully',
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track event',
    });
  }
}

// Update specific content view counts using unified service
async function updateContentViews(trackingData: TrackingData, _eventId: string) {
  try {
    const properties = trackingData.properties || {};

    // Car view tracking
    if (properties.carId) {
      await viewsService.recordCarView(properties.carId);
    }

    // Auction view tracking
    if (properties.auctionId) {
      await viewsService.recordAuctionView(properties.auctionId);
    }

    // Showroom view tracking
    if (properties.showroomId) {
      await viewsService.recordShowroomView(properties.showroomId);
    }
  } catch (error) {
    console.error('Error updating content views:', error);
  }
}
