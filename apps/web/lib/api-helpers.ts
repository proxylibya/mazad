import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';

/**
 * أنواع الأخطاء المعيارية في التطبيق
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SERVER_ERROR: 'SERVER_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * بنية الاستجابة المعيارية للـ API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ErrorCode;
  message?: string;
  timestamp?: string;
  requestId?: string;
}

/**
 * فئة لتمثيل أخطاء API المخصصة
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCodes.SERVER_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * أخطاء API محددة مسبقاً
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'بيانات غير صحيحة') {
    super(message, 400, ErrorCodes.VALIDATION_ERROR);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'المورد غير موجود') {
    super(message, 404, ErrorCodes.NOT_FOUND);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'غير مخول للوصول') {
    super(message, 401, ErrorCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'غير مسموح') {
    super(message, 403, ErrorCodes.FORBIDDEN);
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = 'خطأ في قاعدة البيانات') {
    super(message, 500, ErrorCodes.DATABASE_ERROR);
  }
}

/**
 * معالج شامل لأخطاء API
 */
export function handleApiError(
  error: unknown,
  req: NextApiRequest,
  res: NextApiResponse,
  requestId?: string
): void {
  const timestamp = new Date().toISOString();

  // إذا كان خطأ API مخصص
  if (error instanceof ApiError) {
    logger.warn(`API Error: ${error.message}`, {
      code: error.code,
      statusCode: error.statusCode,
      method: req.method,
      url: req.url,
      requestId,
      timestamp
    });

    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp,
      requestId
    });
    return;
  }

  // خطأ غير متوقع
  logger.error('Unhandled API Error', {
    error: error instanceof Error ? error.message : String(error),
    method: req.method,
    url: req.url,
    requestId,
    timestamp
  });

  // عدم الكشف عن تفاصيل الخطأ في البيئة الإنتاجية
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: 'خطأ داخلي في الخادم',
    code: ErrorCodes.SERVER_ERROR,
    ...(isDevelopment && {
      details: error instanceof Error ? error.message : String(error)
    }),
    timestamp,
    requestId
  });
}

/**
 * دالة مساعدة لإرسال استجابة نجاح
 */
export function sendSuccess<T>(
  res: NextApiResponse,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(response);
}

/**
 * دالة مساعدة لإرسال استجابة خطأ
 */
export function sendError(
  res: NextApiResponse,
  message: string,
  statusCode: number = 400,
  code?: ErrorCode
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(response);
}

/**
 * middleware للتحقق من طريقة HTTP المسموحة
 */
export function validateHttpMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedMethods: string[]
): boolean {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods.join(', '));
    sendError(
      res,
      `الطريقة ${req.method} غير مدعومة. الطرق المدعومة: ${allowedMethods.join(', ')}`,
      405,
      ErrorCodes.INVALID_REQUEST
    );
    return false;
  }
  return true;
}

/**
 * middleware للتحقق من صحة معرف UUID
 */
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * التحقق من معرف CUID (المستخدم افتراضياً بواسطة Prisma: cuid())
 * الشكل المتوقع: يبدأ بحرف 'c' متبوعاً بـ 24 محرفاً من a-z0-9 (الطول 25)
 */
export function validateCuid(id: string): boolean {
  const cuidRegex = /^c[a-z0-9]{24}$/i;
  return cuidRegex.test(id);
}

/**
 * التحقق من معرف مخصص بصيغة prefix_timestamp_random
 * مثال: car_1764487145361_u4em7m05k, usr_1764445566514_68xafjvdx
 */
export function validateCustomId(id: string): boolean {
  const customIdRegex = /^[a-z]+_\d+_[a-z0-9]+$/i;
  return customIdRegex.test(id);
}

/**
 * دالة للتحقق من صحة معرف السيارة
 * يقبل: UUID, CUID, أو معرف مخصص (car_...)
 */
export function validateCarId(id: unknown): string {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('معرف السيارة مطلوب ويجب أن يكون نص صحيح');
  }

  const normalized = id.trim();

  // قبول UUID أو CUID أو معرف مخصص
  if (!validateUUID(normalized) && !validateCuid(normalized) && !validateCustomId(normalized)) {
    throw new ValidationError('معرف السيارة غير صحيح');
  }

  return normalized;
}

/**
 * دالة لتوليد معرف طلب فريد
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * middleware لقياس وقت تنفيذ API
 */
export function createApiTimer(operation: string) {
  const startTime = Date.now();

  return {
    end: () => {
      const duration = Date.now() - startTime;
      logger.info(`API Performance: ${operation}`, { duration: `${duration}ms` });
      return duration;
    }
  };
}

/**
 * دالة لتنظيف وتحقق من البيانات الداخلة
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * نمط الاستجابة الموحد لجميع APIs
 */
export async function withApiHandler<T = any>(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse, requestId: string) => Promise<T>,
  allowedMethods?: string[]
): Promise<void> {
  const requestId = generateRequestId();
  const timer = createApiTimer(`${req.method} ${req.url}`);

  try {
    // التحقق من الطريقة إذا كانت محددة
    if (allowedMethods && !validateHttpMethod(req, res, allowedMethods)) {
      return;
    }

    // تسجيل الطلب
    logger.info(`API Request: ${req.method} ${req.url}`, {
      requestId,
      userAgent: req.headers['user-agent']
    });

    // تنفيذ المعالج
    await handler(req, res, requestId);

  } catch (error) {
    handleApiError(error, req, res, requestId);
  } finally {
    timer.end();
  }
}
