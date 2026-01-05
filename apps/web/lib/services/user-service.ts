/**
 * 🧑‍💼 خدمة المستخدمين الموحدة
 * Unified User Service
 * Version: 3.0 - Production Ready
 */

import bcrypt from 'bcryptjs';
import { CrudService, ApiResponse } from '../api/unified-api-system';
import { prisma, dbHelpers } from '../prisma';

// ==========================================
// TYPES
// ==========================================

export interface UserCreateData {
  name: string;
  phone: string;
  email?: string;
  username?: string;
  password: string;
  role?: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  status?: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';
  city?: string;
  avatar?: string;
}

export interface UserUpdateData {
  name?: string;
  phone?: string;
  email?: string;
  username?: string;
  password?: string;
  role?: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  status?: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';
  city?: string;
  avatar?: string;
  verified?: boolean;
}

export interface UserFilter {
  role?: string;
  status?: string;
  verified?: boolean;
  city?: string;
  isDeleted?: boolean;
  search?: string;
}

// ==========================================
// USER SERVICE CLASS
// ==========================================

export class UserService extends CrudService {
  constructor() {
    super({
      model: 'user',
      searchFields: ['name', 'phone', 'email', 'username'],
      allowedFilters: ['role', 'status', 'verified', 'city', 'isDeleted'],
      defaultSort: { field: 'createdAt', order: 'desc' },
      relations: ['wallet', 'cars', 'auctions', 'bids'],
    });
  }

  /**
   * إنشاء مستخدم جديد
   */
  async createUser(data: UserCreateData, createdBy?: string): Promise<ApiResponse> {
    try {
      // Check for existing user
      const existing = await prisma.users.findFirst({
        where: {
          OR: [
            { phone: data.phone },
            { email: data.email || undefined },
            { username: data.username || undefined },
          ],
        },
      });

      if (existing) {
        return {
          success: false,
          error: 'المستخدم موجود بالفعل',
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await prisma.users.create({
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          username: data.username,
          passwordHash,
          role: data.role || 'USER',
          status: data.status || 'ACTIVE',
          city: data.city,
          avatar: data.avatar,
          verified: false,
        },
      });

      // Create wallet using the unified wallet helper
      await dbHelpers.createUserWallet(user.id);

      // Log activity
      if (createdBy) {
        await this.logActivity(createdBy, 'CREATE_USER', user.id, `إنشاء مستخدم جديد: ${user.name}`);
      }

      return {
        success: true,
        data: user,
        message: 'تم إنشاء المستخدم بنجاح',
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: 'حدث خطأ في إنشاء المستخدم',
      };
    }
  }

  /**
   * تحديث بيانات المستخدم
   */
  async updateUser(id: string, data: UserUpdateData, updatedBy?: string): Promise<ApiResponse> {
    try {
      // Check user exists
      const existing = await prisma.users.findUnique({
        where: { id },
      });

      if (!existing) {
        return {
          success: false,
          error: 'المستخدم غير موجود',
        };
      }

      // Prepare update data
      const updateData: any = { ...data };

      // Hash password if provided
      if (data.password) {
        updateData.passwordHash = await bcrypt.hash(data.password, 10);
        delete updateData.password;
      }

      // Update user
      const user = await prisma.users.update({
        where: { id },
        data: updateData,
      });

      // Log activity
      if (updatedBy) {
        await this.logActivity(updatedBy, 'UPDATE_USER', user.id, `تحديث بيانات المستخدم: ${user.name}`);
      }

      return {
        success: true,
        data: user,
        message: 'تم تحديث البيانات بنجاح',
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: 'حدث خطأ في تحديث البيانات',
      };
    }
  }

  /**
   * حذف مستخدم (soft delete)
   */
  async deleteUser(id: string, deletedBy?: string, permanent = false): Promise<ApiResponse> {
    try {
      const user = await prisma.users.findUnique({
        where: { id },
        include: {
          cars: { where: { isDeleted: false } },
          auctions: { where: { status: 'ACTIVE' } },
          bids: { where: { status: 'ACTIVE' } },
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'المستخدم غير موجود',
        };
      }

      if (permanent) {
        // Permanent delete - use with caution!
        await prisma.users.delete({
          where: { id },
        });

        if (deletedBy) {
          await this.logActivity(deletedBy, 'DELETE_USER_PERMANENT', id, `حذف نهائي للمستخدم: ${user.name}`);
        }

        return {
          success: true,
          message: 'تم حذف المستخدم نهائياً',
        };
      } else {
        // Soft delete
        await prisma.users.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
            status: 'SUSPENDED',
          },
        });

        if (deletedBy) {
          await this.logActivity(deletedBy, 'DELETE_USER_SOFT', id, `حذف مؤقت للمستخدم: ${user.name}`);
        }

        return {
          success: true,
          message: 'تم حذف المستخدم مؤقتاً',
        };
      }
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: 'حدث خطأ في حذف المستخدم',
      };
    }
  }

  /**
   * استعادة مستخدم محذوف
   */
  async restoreUser(id: string, restoredBy?: string): Promise<ApiResponse> {
    try {
      const user = await prisma.users.findFirst({
        where: {
          id,
          isDeleted: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'المستخدم غير موجود في المحذوفات',
        };
      }

      const restored = await prisma.users.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          status: 'ACTIVE',
        },
      });

      if (restoredBy) {
        await this.logActivity(restoredBy, 'RESTORE_USER', id, `استعادة المستخدم: ${restored.name}`);
      }

      return {
        success: true,
        data: restored,
        message: 'تمت استعادة المستخدم بنجاح',
      };
    } catch (error) {
      console.error('Restore user error:', error);
      return {
        success: false,
        error: 'حدث خطأ في استعادة المستخدم',
      };
    }
  }

  /**
   * الحصول على إحصائيات المستخدم
   */
  async getUserStats(id: string): Promise<ApiResponse> {
    try {
      const stats = await prisma.users.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              cars: true,
              auctions: true,
              bids: true,
              reviews: true,
              notifications: true,
            },
          },
          wallet: true,
        },
      });

      if (!stats) {
        return {
          success: false,
          error: 'المستخدم غير موجود',
        };
      }

      return {
        success: true,
        data: {
          user: {
            id: stats.id,
            name: stats.name,
            phone: stats.phone,
            role: stats.role,
            status: stats.status,
            verified: stats.verified,
            createdAt: stats.createdAt,
          },
          counts: stats._count,
          wallet: stats.wallet,
        },
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      return {
        success: false,
        error: 'حدث خطأ في جلب الإحصائيات',
      };
    }
  }

  /**
   * تحديث حالة المستخدم
   */
  async updateUserStatus(
    id: string,
    status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED',
    updatedBy?: string,
    reason?: string
  ): Promise<ApiResponse> {
    try {
      const user = await prisma.users.update({
        where: { id },
        data: { status },
      });

      if (updatedBy) {
        await this.logActivity(
          updatedBy,
          `UPDATE_USER_STATUS_${status}`,
          id,
          `تحديث حالة المستخدم ${user.name} إلى ${status}${reason ? `: ${reason}` : ''}`
        );
      }

      return {
        success: true,
        data: user,
        message: `تم تحديث حالة المستخدم إلى ${status}`,
      };
    } catch (error) {
      console.error('Update user status error:', error);
      return {
        success: false,
        error: 'حدث خطأ في تحديث الحالة',
      };
    }
  }

  /**
   * التحقق من المستخدم
   */
  async verifyUser(id: string, verifiedBy?: string): Promise<ApiResponse> {
    try {
      const user = await prisma.users.update({
        where: { id },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });

      if (verifiedBy) {
        await this.logActivity(verifiedBy, 'VERIFY_USER', id, `التحقق من المستخدم: ${user.name}`);
      }

      return {
        success: true,
        data: user,
        message: 'تم التحقق من المستخدم بنجاح',
      };
    } catch (error) {
      console.error('Verify user error:', error);
      return {
        success: false,
        error: 'حدث خطأ في التحقق',
      };
    }
  }

  /**
   * البحث عن المستخدمين
   */
  async searchUsers(query: string, filters: UserFilter = {}): Promise<ApiResponse> {
    try {
      const where: any = {
        isDeleted: filters.isDeleted || false,
      };

      // Apply filters
      if (filters.role) where.role = filters.role;
      if (filters.status) where.status = filters.status;
      if (filters.verified !== undefined) where.verified = filters.verified;
      if (filters.city) where.city = filters.city;

      // Apply search
      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ];
      }

      const users = await prisma.users.findMany({
        where,
        select: {
          id: true,
          publicId: true,
          name: true,
          phone: true,
          email: true,
          username: true,
          role: true,
          status: true,
          city: true,
          avatar: true,
          verified: true,
          createdAt: true,
          lastLogin: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return {
        success: true,
        data: users,
        meta: {
          total: users.length,
        },
      };
    } catch (error) {
      console.error('Search users error:', error);
      return {
        success: false,
        error: 'حدث خطأ في البحث',
      };
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async logActivity(
    userId: string,
    action: string,
    entityId: string | null,
    description: string
  ) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType: 'user',
          entityId,
          description,
          success: true,
        },
      });
    } catch (error) {
      console.error('Log activity error:', error);
    }
  }
}

// Create singleton instance
export const userService = new UserService();

// Export default
export default userService;
