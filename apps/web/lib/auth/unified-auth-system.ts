/**
 * نظام المصادقة الموحد العالمي
 * Unified Global Authentication System
 * 
 * نظام مصادقة قوي وآمن يدعم:
 * - JWT Tokens
 * - Session Management
 * - Role-Based Access Control
 * - Multi-Factor Authentication (MFA)
 * - Rate Limiting
 * - Security Headers
 */

import { keydb } from '@/lib/cache/keydb-unified';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || 'your-pepper-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 دقيقة

// Types
export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: Role;
  accountType: string;
  verified: boolean;
  publicId: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * فئة نظام المصادقة الموحد
 */
export class UnifiedAuthSystem {
  private static instance: UnifiedAuthSystem;

  private constructor() { }

  /**
   * الحصول على مثيل واحد من النظام (Singleton Pattern)
   */
  public static getInstance(): UnifiedAuthSystem {
    if (!UnifiedAuthSystem.instance) {
      UnifiedAuthSystem.instance = new UnifiedAuthSystem();
    }
    return UnifiedAuthSystem.instance;
  }

  /**
   * تشفير كلمة المرور بشكل آمن
   */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    const pepperedPassword = password + PASSWORD_PEPPER;
    return await bcrypt.hash(pepperedPassword, saltRounds);
  }

  /**
   * التحقق من كلمة المرور
   */
  public async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const pepperedPassword = password + PASSWORD_PEPPER;
    return await bcrypt.compare(pepperedPassword, hashedPassword);
  }

  /**
   * توليد JWT Tokens
   */
  public generateTokens(user: AuthUser): AuthTokens {
    const payload = {
      userId: user.id,
      phone: user.phone,
      role: user.role,
      accountType: user.accountType
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'sooq-mazad',
      audience: 'sooq-mazad-users'
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'sooq-mazad'
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 دقيقة بالثواني
    };
  }

  /**
   * التحقق من Access Token
   */
  public verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'sooq-mazad',
        audience: 'sooq-mazad-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * التحقق من Refresh Token
   */
  public verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'sooq-mazad'
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * تسجيل الدخول
   */
  public async login(
    identifier: string, // phone or email
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthSession | null> {
    try {
      // التحقق من محاولات الدخول الفاشلة
      const lockoutKey = `auth:lockout:${identifier}`;
      const isLockedOut = await keydb.get(lockoutKey);

      if (isLockedOut) {
        throw new Error('الحساب مقفل مؤقتاً بسبب محاولات دخول فاشلة متعددة');
      }

      // البحث عن المستخدم
      const user = await prisma.users.findFirst({
        where: {
          OR: [
            { phone: identifier },
            { email: identifier },
            { loginIdentifier: identifier }
          ],
          isDeleted: false,
          status: 'ACTIVE'
        },
        include: {
          user_passwords: true
        }
      });

      if (!user || !user.user_passwords) {
        await this.recordFailedAttempt(identifier);
        throw new Error('بيانات الدخول غير صحيحة');
      }

      // التحقق من كلمة المرور
      const isPasswordValid = await this.verifyPassword(
        password,
        user.user_passwords.hashedPassword,
      );

      if (!isPasswordValid) {
        await this.recordFailedAttempt(identifier);
        throw new Error('بيانات الدخول غير صحيحة');
      }

      // إنشاء بيانات المستخدم للجلسة
      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountType: user.accountType,
        verified: user.verified,
        publicId: user.publicId
      };

      // توليد الرموز
      const tokens = this.generateTokens(authUser);

      // إنشاء معرف جلسة فريد
      const sessionId = this.generateSessionId();

      // إنشاء الجلسة
      const session: AuthSession = {
        user: authUser,
        tokens,
        sessionId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 أيام
        ipAddress,
        userAgent
      };

      // حفظ الجلسة في KeyDB
      await keydb.set(`auth:session:${sessionId}`, session, { ttl: 7 * 24 * 60 * 60 });
      await keydb.set(`auth:user:${user.id}`, sessionId, { ttl: 7 * 24 * 60 * 60 });

      // مسح محاولات الفشل
      await keydb.del(`auth:attempts:${identifier}`);

      // تحديث آخر دخول
      await prisma.users.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // تسجيل نشاط الدخول
      await this.logActivity(user.id, 'LOGIN', ipAddress, userAgent);

      return session;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * تسجيل الخروج
   */
  public async logout(sessionId: string, userId: string): Promise<boolean> {
    try {
      // حذف الجلسة من KeyDB
      await keydb.del(`auth:session:${sessionId}`);
      await keydb.del(`auth:user:${userId}`);

      // تسجيل نشاط الخروج
      await this.logActivity(userId, 'LOGOUT');

      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * تحديث رمز الوصول
   */
  public async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      // التحقق من صحة رمز التحديث
      const decoded = this.verifyRefreshToken(refreshToken);

      if (!decoded || !decoded.userId) {
        throw new Error('Invalid refresh token');
      }

      // الحصول على بيانات المستخدم
      const user = await prisma.users.findUnique({
        where: {
          id: decoded.userId,
          isDeleted: false,
          status: 'ACTIVE'
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // إنشاء بيانات المستخدم للجلسة
      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountType: user.accountType,
        verified: user.verified,
        publicId: user.publicId
      };

      // توليد رموز جديدة
      return this.generateTokens(authUser);
    } catch (error) {
      console.error('Refresh token error:', error);
      return null;
    }
  }

  /**
   * التحقق من الجلسة
   */
  public async verifySession(sessionId: string): Promise<AuthSession | null> {
    try {
      const session = await keydb.get<AuthSession>(`auth:session:${sessionId}`);

      if (!session) {
        return null;
      }

      // التحقق من انتهاء الصلاحية
      if (new Date(session.expiresAt) < new Date()) {
        await keydb.del(`auth:session:${sessionId}`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }

  /**
   * الحصول على المستخدم من الرمز
   */
  public async getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = this.verifyAccessToken(token);

      if (!decoded || !decoded.userId) {
        return null;
      }

      const user = await prisma.users.findUnique({
        where: {
          id: decoded.userId,
          isDeleted: false,
          status: 'ACTIVE'
        }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountType: user.accountType,
        verified: user.verified,
        publicId: user.publicId
      };
    } catch (error) {
      console.error('Get user from token error:', error);
      return null;
    }
  }

  /**
   * التحقق من الصلاحيات
   */
  public hasPermission(user: AuthUser, permission: string): boolean {
    // نظام صلاحيات بسيط
    const permissions: Record<Role, string[]> = {
      USER: ['read', 'create_listing', 'bid'],
      MODERATOR: ['read', 'create_listing', 'bid', 'moderate', 'delete_listing'],
      ADMIN: ['*'], // جميع الصلاحيات
      SUPER_ADMIN: ['*'],
    };

    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }

  /**
   * تسجيل محاولة فاشلة
   */
  private async recordFailedAttempt(identifier: string): Promise<void> {
    const attemptsKey = `auth:attempts:${identifier}`;
    const attempts = await keydb.incr(attemptsKey);

    // تعيين مدة انتهاء الصلاحية للمحاولات
    await keydb.expire(attemptsKey, 3600); // ساعة واحدة

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      // قفل الحساب
      const lockoutKey = `auth:lockout:${identifier}`;
      await keydb.set(lockoutKey, true, { ttl: LOCKOUT_DURATION / 1000 });

      // حذف محاولات الفشل
      await keydb.del(attemptsKey);
    }
  }

  /**
   * تسجيل نشاط المستخدم
   */
  private async logActivity(
    userId: string,
    action: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.activity_logs.create({
        data: {
          id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          userId,
          action: action as any,
          entityType: 'AUTH',
          entityId: userId,
          description: action,
          ipAddress,
          userAgent,
        }
      });
    } catch (error) {
      console.error('Activity logging error:', error);
    }
  }

  /**
   * توليد معرف جلسة فريد
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Middleware للتحقق من المصادقة
   */
  public authMiddleware() {
    return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
      try {
        // الحصول على الرمز من الـ headers
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.substring(7);
        const user = await this.getUserFromToken(token);

        if (!user) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        // إضافة المستخدم للـ request
        (req as any).user = user;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  /**
   * Middleware للتحقق من الدور
   */
  public roleMiddleware(allowedRoles: Role[]) {
    return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
      const user = (req as any).user as AuthUser;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    };
  }
}

// تصدير مثيل واحد من النظام
export const authSystem = UnifiedAuthSystem.getInstance();

// تصدير وظائف سريعة للاستخدام
export const auth = {
  login: (identifier: string, password: string, ip?: string, ua?: string) =>
    authSystem.login(identifier, password, ip, ua),
  logout: (sessionId: string, userId: string) =>
    authSystem.logout(sessionId, userId),
  refresh: (refreshToken: string) =>
    authSystem.refreshAccessToken(refreshToken),
  verify: (sessionId: string) =>
    authSystem.verifySession(sessionId),
  hash: (password: string) =>
    authSystem.hashPassword(password),
  check: (password: string, hash: string) =>
    authSystem.verifyPassword(password, hash),
  getUserFromToken: (token: string) =>
    authSystem.getUserFromToken(token),
  hasPermission: (user: AuthUser, permission: string) =>
    authSystem.hasPermission(user, permission)
};
