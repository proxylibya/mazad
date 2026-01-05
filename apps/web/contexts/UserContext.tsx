import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import { getUserSession } from '../utils/authUtils';

// نوع بيانات المستخدم
interface User {
  id: string;
  name?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  image?: string | null;
  profileImage?: string | null;
  role?: string;
  accountType?: string;
  verified?: boolean;
  createdAt?: string;
}

declare global {
  interface Window {
    updateUserContext?: (updatedUser: User | null) => void;
  }
}

// نوع بيانات السياق
interface UserContextType {
  user: User | null;
  loading: boolean;
  updateUser: (userData: Partial<User>) => void;
  updateProfileImage: (imageUrl: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// إنشاء السياق
const UserContext = createContext<UserContextType | undefined>(undefined);

// مزود السياق
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isUpdatingRef = useRef(false); // منع loop التحديث

  // تحميل بيانات المستخدم من localStorage
  const loadUserFromStorage = () => {
    try {
      setLoading(true);
      const session = getUserSession();
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      let effectiveUser: User | null = null;
      let effectiveToken: string | null = token;

      if (session && session.user && session.token) {
        effectiveUser = session.user as User;
        effectiveToken = session.token;
        localStorage.setItem('user', JSON.stringify(session.user));
        localStorage.setItem('token', session.token);
      } else if (savedUser && token) {
        effectiveUser = JSON.parse(savedUser);
        effectiveToken = token;
      }

      // تقليل رسائل الكونسول في وضع التطوير
      if (process.env.NODE_ENV !== 'development') {
        console.log('🔍 فحص localStorage:', {
          hasUser: !!effectiveUser,
          hasToken: !!effectiveToken,
          userLength: effectiveUser ? JSON.stringify(effectiveUser).length : 0,
          tokenLength: effectiveToken?.length,
        });
      }

      if (effectiveUser && effectiveToken) {
        setUser(effectiveUser);
        if (process.env.NODE_ENV !== 'development') {
          console.log('✅ تم تحميل بيانات المستخدم من localStorage:', {
            id: effectiveUser.id,
            name: effectiveUser.name,
            accountType: effectiveUser.accountType,
          });
        }
      } else {
        setUser(null);
        // تقليل رسائل "لا توجد بيانات" في التطوير
        if (process.env.NODE_ENV !== 'development') {
          console.log('❌ لا توجد بيانات مستخدم في localStorage');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات المستخدم:', error);
      // تنظيف البيانات التالفة
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // تحديث بيانات المستخدم
  const updateUser = (userData: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);

    try {
      isUpdatingRef.current = true; // تفعيل flag
      localStorage.setItem('user', JSON.stringify(updatedUser));

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ تحديث المستخدم:', { id: updatedUser.id, fields: Object.keys(userData) });
      }

      // إرسال حدث مخصص لإعلام المكونات الأخرى
      window.dispatchEvent(
        new CustomEvent('userUpdated', {
          detail: updatedUser,
        }),
      );

      // إيقاف flag بعد فترة قصيرة
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    } catch (error) {
      console.error('خطأ في حفظ بيانات المستخدم:', error);
      isUpdatingRef.current = false;
    }
  };

  // تحديث الصورة الشخصية
  const updateProfileImage = (imageUrl: string) => {
    updateUser({ profileImage: imageUrl });
  };

  // تسجيل الخروج
  const logout = async () => {
    try {
      const { SafeLocalStorage } = await import('../utils/unifiedLocalStorage');
      SafeLocalStorage.clearUserData();
    } catch (error) {
      // في حالة فشل الاستيراد، استخدم الطريقة التقليدية
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('wallet');
      localStorage.removeItem('favorites');
      localStorage.removeItem('reminders');
    }

    setUser(null);
    window.location.href = '/';
  };

  // تحديث بيانات المستخدم من الخادم
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }

      setLoading(true);
      const response = await fetch('/api/auth/check', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));

          // إرسال حدث مخصص لإعلام المكونات الأخرى
          window.dispatchEvent(
            new CustomEvent('userUpdated', {
              detail: data.user,
            }),
          );
        } else {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('خطأ في تحديث بيانات المستخدم:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحميل البيانات عند بدء التشغيل
  useEffect(() => {
    loadUserFromStorage();

    // الاستماع لتغييرات localStorage من علامات تبويب أخرى فقط
    const handleStorageChange = (e: StorageEvent) => {
      // تجاهل التغييرات أثناء التحديث المحلي
      if (isUpdatingRef.current) {
        return;
      }

      if (e.key === 'user' || e.key === 'token') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 تغيير localStorage من تبويب آخر');
        }
        loadUserFromStorage();
      }
    };

    // الاستماع للأحداث المخصصة
    const handleUserUpdate = (e: CustomEvent<User | null>) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📨 حدث تحديث مستخدم');
      }
      setUser(e.detail ?? null);
      setLoading(false);
    };

    // الاستماع لحدث تسجيل الدخول الناجح
    const handleLoginSuccess = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ تسجيل دخول ناجح');
      }
      setTimeout(() => {
        loadUserFromStorage();
      }, 100);
    };

    // الاستماع لحدث تحديث الصورة الشخصية
    const handleProfileImageUpdate = (e: CustomEvent<{ imageUrl?: string }>) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🖼️ تحديث صورة شخصية');
      }
      if (e.detail?.imageUrl) {
        // الحصول على المستخدم الحالي من localStorage للتأكد من أحدث البيانات
        try {
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            const currentUser = JSON.parse(savedUser);
            const updatedUser = {
              ...currentUser,
              profileImage: e.detail.imageUrl,
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('تم تحديث الصورة الشخصية في UserContext:', e.detail.imageUrl);
          }
        } catch (error) {
          console.error('خطأ في تحديث الصورة الشخصية:', error);
        }
      }
    };

    // إضافة دالة عامة لتحديث المستخدم
    window.updateUserContext = (updatedUser: User | null) => {
      console.log('UserContext: تحديث مباشر للمستخدم', updatedUser);
      setUser(updatedUser);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleUserUpdate as EventListener);
    window.addEventListener('loginSuccess', handleLoginSuccess);
    window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate as EventListener);
      window.removeEventListener('loginSuccess', handleLoginSuccess);
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
      delete window.updateUserContext;
    };
  }, []);

  const value: UserContextType = {
    user,
    loading,
    updateUser,
    updateProfileImage,
    logout,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Hook لاستخدام السياق
export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
