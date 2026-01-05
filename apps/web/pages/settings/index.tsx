/**
 * صفحة إعدادات المستخدم - apps/web
 * إعدادات شخصية للمستخدم العادي
 */
import { OpensooqNavbar } from '@/components/common';
import { useQuickNotifications } from '@/components/ui/EnhancedNotificationSystem';
import { checkAuth } from '@/lib/auth';
import {
  ArrowRightIcon,
  BellIcon,
  CameraIcon,
  CheckIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

interface UserSettings {
  // إعدادات الإشعارات
  smsNotifications: boolean;
  pushNotifications: boolean;
  auctionReminders: boolean;
  bidUpdates: boolean;
  messageAlerts: boolean;

  // إعدادات الخصوصية
  showPhone: boolean;
  allowMessages: boolean;
  showOnlineStatus: boolean;

  // إعدادات الحساب
  language: string;
  currency: string;
}

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function UserSettingsPage() {
  const router = useRouter();
  const notifications = useQuickNotifications();

  // قراءة التبويب من URL
  const tabFromQuery = router.query.tab as string | undefined;

  // تحويل أسماء التبويبات القادمة من صفحة حسابي
  const mapTabToSection = (tab: string | undefined): string => {
    switch (tab) {
      case 'profile':
        return 'profile';
      case 'security':
        return 'password';
      case 'preferences':
        return 'privacy';
      case 'notifications':
        return 'notifications';
      case 'privacy':
        return 'privacy';
      case 'password':
        return 'password';
      case 'account':
        return 'account';
      default:
        return 'profile';
    }
  };

  const [activeSection, setActiveSection] = useState(() => mapTabToSection(tabFromQuery));
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // بيانات الملف الشخصي
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    bio: '',
    profileImage: '',
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // جلب بيانات المستخدم عند التحميل من API
  React.useEffect(() => {
    const loadUserData = async () => {
      try {
        // أولاً: جلب البيانات المحفوظة محلياً للعرض السريع
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setProfileData({
            name: user.name || '',
            phone: user.phone || '',
            email: user.email || '',
            city: user.city || '',
            bio: user.bio || '',
            profileImage: user.profileImage || '',
          });
        }

        // ثانياً: جلب البيانات المحدثة من API
        const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/user/profile', {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const apiUser = result.data;
            const updatedData = {
              name: apiUser.name || '',
              phone: apiUser.phone || '',
              email: apiUser.email || '',
              city: apiUser.city || '',
              bio: apiUser.bio || '',
              profileImage: apiUser.profileImage || '',
            };
            setProfileData(updatedData);

            // تحديث localStorage بالبيانات المحدثة
            const existingUser = savedUser ? JSON.parse(savedUser) : {};
            localStorage.setItem(
              'user',
              JSON.stringify({
                ...existingUser,
                ...apiUser,
              }),
            );
          }
        } else {
          console.log('فشل في جلب البيانات من API، استخدام البيانات المحلية');
        }
      } catch (error) {
        console.error('خطأ في جلب بيانات المستخدم:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadUserData();
  }, []);

  // تحديث حقل في الملف الشخصي
  const updateProfileField = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // دالة للحصول على رمز المصادقة
  const getAuthToken = (): string | null => {
    try {
      // محاولة الحصول من localStorage
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      if (token) return token;

      // محاولة الحصول من user object
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.token) return user.token;
      }

      return null;
    } catch {
      return null;
    }
  };

  // رفع صورة الملف الشخصي
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      notifications.error('خطأ', 'يرجى اختيار صورة بصيغة JPG, PNG أو WebP');
      return;
    }

    // التحقق من حجم الملف (أقصى 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notifications.error('خطأ', 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile');

      // إعداد الطلب مع رمز المصادقة
      const headers: HeadersInit = {};
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('[رفع صورة] جاري رفع الصورة...', { hasToken: !!token });

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include', // إرسال cookies
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success !== false) {
        const imageUrl = data.imageUrl || data.url;
        setProfileData((prev) => ({ ...prev, profileImage: imageUrl }));

        // تحديث localStorage بالصورة الجديدة
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          localStorage.setItem('user', JSON.stringify({ ...user, profileImage: imageUrl }));
        }

        notifications.success('تم الرفع', 'تم رفع الصورة بنجاح');
      } else {
        console.error('[رفع صورة] فشل:', data);
        notifications.error('خطأ', data.error || 'فشل في رفع الصورة');
      }
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      notifications.error('خطأ', 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploadingImage(false);
      // إعادة تعيين input الملف للسماح برفع نفس الصورة مرة أخرى
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // حفظ الملف الشخصي
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // إعداد الطلب مع رمز المصادقة
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData),
        credentials: 'include', // إرسال cookies
      });

      if (response.ok) {
        const data = await response.json();
        // تحديث localStorage
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          localStorage.setItem('user', JSON.stringify({ ...user, ...profileData, ...data.data }));
        }
        notifications.success('تم الحفظ', 'تم تحديث الملف الشخصي بنجاح');
        setHasChanges(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        notifications.error('خطأ', errorData.message || errorData.error || 'فشل في حفظ التغييرات');
      }
    } catch (error) {
      console.error('خطأ في حفظ الملف الشخصي:', error);
      notifications.error('خطأ', 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  // إعدادات تغيير كلمة المرور
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // إعدادات المستخدم
  const [settings, setSettings] = useState<UserSettings>({
    smsNotifications: false,
    pushNotifications: true,
    auctionReminders: true,
    bidUpdates: true,
    messageAlerts: true,
    showPhone: false,
    allowMessages: true,
    showOnlineStatus: true,
    language: 'ar',
    currency: 'LYD',
  });

  // حالة حذف الحساب
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{
    hasPendingDeletion: boolean;
    scheduledDeletionAt: string | null;
    deletionRequestedAt: string | null;
  }>({
    hasPendingDeletion: false,
    scheduledDeletionAt: null,
    deletionRequestedAt: null,
  });
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isLoadingDeletion, setIsLoadingDeletion] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  // جلب حالة طلب الحذف
  const fetchDeletionStatus = React.useCallback(async () => {
    try {
      const response = await fetch('/api/account/delete-request', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDeletionStatus(data);
        if (data.hasPendingDeletion) {
          setShowCountdownModal(true);
        }
      }
    } catch (error) {
      console.error('خطأ في جلب حالة الحذف:', error);
    }
  }, []);

  // تحديث العد التنازلي
  React.useEffect(() => {
    if (!deletionStatus.scheduledDeletionAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(deletionStatus.scheduledDeletionAt!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [deletionStatus.scheduledDeletionAt]);

  // جلب حالة الحذف عند التحميل
  React.useEffect(() => {
    fetchDeletionStatus();
  }, [fetchDeletionStatus]);

  // طلب حذف الحساب
  const handleRequestDeletion = async () => {
    setIsLoadingDeletion(true);
    try {
      const response = await fetch('/api/account/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setDeletionStatus({
          hasPendingDeletion: true,
          scheduledDeletionAt: data.scheduledDeletionAt,
          deletionRequestedAt: data.deletionRequestedAt,
        });
        setShowDeleteModal(false);
        setShowCountdownModal(true);
        notifications.success('تم', 'تم تقديم طلب حذف الحساب');
      } else {
        notifications.error('خطأ', data.error || 'فشل في تقديم طلب الحذف');
      }
    } catch (error) {
      console.error('خطأ في طلب الحذف:', error);
      notifications.error('خطأ', 'حدث خطأ أثناء تقديم الطلب');
    } finally {
      setIsLoadingDeletion(false);
    }
  };

  // إلغاء طلب الحذف
  const handleCancelDeletion = async () => {
    setIsLoadingDeletion(true);
    try {
      const response = await fetch('/api/account/delete-request', {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setDeletionStatus({
          hasPendingDeletion: false,
          scheduledDeletionAt: null,
          deletionRequestedAt: null,
        });
        setShowCountdownModal(false);
        notifications.success('تم', 'تم إلغاء طلب حذف الحساب');
      } else {
        notifications.error('خطأ', data.error || 'فشل في إلغاء طلب الحذف');
      }
    } catch (error) {
      console.error('خطأ في إلغاء الحذف:', error);
      notifications.error('خطأ', 'حدث خطأ أثناء إلغاء الطلب');
    } finally {
      setIsLoadingDeletion(false);
    }
  };

  // تحديث القسم النشط عند تغيير URL
  React.useEffect(() => {
    if (tabFromQuery) {
      setActiveSection(mapTabToSection(tabFromQuery));
    }
  }, [tabFromQuery]);

  const sections: SettingSection[] = [
    {
      id: 'profile',
      title: 'الملف الشخصي',
      description: 'تعديل الاسم والصورة والمعلومات الشخصية',
      icon: UserCircleIcon,
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      description: 'تحكم في طريقة استلام التنبيهات',
      icon: BellIcon,
    },
    {
      id: 'password',
      title: 'الأمان',
      description: 'كلمة المرور والحماية',
      icon: KeyIcon,
    },
    {
      id: 'account',
      title: 'الحساب',
      description: 'إعدادات الحساب العامة',
      icon: UserCircleIcon,
    },
  ];

  // تتبع التغييرات
  const handleSettingChange = (key: keyof UserSettings, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // التحقق من كلمة المرور
  const validatePassword = (): boolean => {
    const errors: string[] = [];

    if (!passwordData.currentPassword) {
      errors.push('يرجى إدخال كلمة المرور الحالية');
    }

    if (!passwordData.newPassword) {
      errors.push('يرجى إدخال كلمة المرور الجديدة');
    } else if (passwordData.newPassword.length < 8) {
      errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.push('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
    }

    setPasswordErrors(errors);
    return errors.length === 0;
  };

  // حفظ الإعدادات
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // TODO: حفظ الإعدادات في الخادم
      await new Promise((resolve) => setTimeout(resolve, 1000));
      notifications.success('تم الحفظ', 'تم حفظ الإعدادات بنجاح');
      setHasChanges(false);
    } catch (error) {
      notifications.error('خطأ', 'فشل في حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  // تغيير كلمة المرور
  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setIsSaving(true);
    try {
      // TODO: تغيير كلمة المرور في الخادم
      await new Promise((resolve) => setTimeout(resolve, 1000));
      notifications.success('تم التغيير', 'تم تغيير كلمة المرور بنجاح');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors([]);
    } catch (error) {
      notifications.error('خطأ', 'فشل في تغيير كلمة المرور');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Component
  const Toggle = ({
    enabled,
    onChange,
    label,
    description,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? '-translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  // عرض قسم الإشعارات
  const renderNotificationsSection = () => (
    <div className="space-y-1 divide-y divide-gray-100">
      <div className="pb-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <BellIcon className="h-4 w-4" />
          طرق الإشعارات
        </h4>
        <Toggle
          enabled={settings.smsNotifications}
          onChange={(v) => handleSettingChange('smsNotifications', v)}
          label="إشعارات SMS"
          description="استلام الإشعارات عبر الرسائل النصية"
        />
        <Toggle
          enabled={settings.pushNotifications}
          onChange={(v) => handleSettingChange('pushNotifications', v)}
          label="الإشعارات الفورية"
          description="إشعارات المتصفح والتطبيق"
        />
      </div>

      <div className="pt-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <DevicePhoneMobileIcon className="h-4 w-4" />
          أنواع الإشعارات
        </h4>
        <Toggle
          enabled={settings.auctionReminders}
          onChange={(v) => handleSettingChange('auctionReminders', v)}
          label="تذكيرات المزادات"
          description="تذكير قبل انتهاء المزادات المفضلة"
        />
        <Toggle
          enabled={settings.bidUpdates}
          onChange={(v) => handleSettingChange('bidUpdates', v)}
          label="تحديثات المزايدات"
          description="إشعار عند تلقي مزايدة جديدة على مزاداتك"
        />
        <Toggle
          enabled={settings.messageAlerts}
          onChange={(v) => handleSettingChange('messageAlerts', v)}
          label="تنبيهات الرسائل"
          description="إشعار عند استلام رسائل جديدة"
        />
      </div>
    </div>
  );

  // عرض قسم كلمة المرور
  const renderPasswordSection = () => (
    <div className="space-y-4">
      {passwordErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h4 className="text-sm font-medium text-red-800">يرجى تصحيح الأخطاء التالية:</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
                {passwordErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">كلمة المرور الحالية</label>
        <div className="relative">
          <input
            type={showPasswords.current ? 'text' : 'password'}
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="أدخل كلمة المرور الحالية"
          />
          <button
            type="button"
            onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.current ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">كلمة المرور الجديدة</label>
        <div className="relative">
          <input
            type={showPasswords.new ? 'text' : 'password'}
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="أدخل كلمة المرور الجديدة"
          />
          <button
            type="button"
            onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.new ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">يجب أن تكون 8 أحرف على الأقل</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          تأكيد كلمة المرور الجديدة
        </label>
        <div className="relative">
          <input
            type={showPasswords.confirm ? 'text' : 'password'}
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="أعد إدخال كلمة المرور الجديدة"
          />
          <button
            type="button"
            onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.confirm ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <button
        onClick={handleChangePassword}
        disabled={isSaving}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>جاري التغيير...</span>
          </>
        ) : (
          <>
            <KeyIcon className="h-4 w-4" />
            <span>تغيير كلمة المرور</span>
          </>
        )}
      </button>
    </div>
  );

  // عرض قسم الحساب
  const renderAccountSection = () => (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">اللغة المفضلة</label>
        <select
          value={settings.language}
          onChange={(e) => handleSettingChange('language', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">العملة المفضلة</label>
        <select
          value={settings.currency}
          onChange={(e) => handleSettingChange('currency', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="LYD">دينار ليبي (LYD)</option>
          <option value="USD">دولار أمريكي (USD)</option>
        </select>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">إجراءات الحساب</h4>
        <div className="space-y-2">
          <Link
            href="/my-account"
            className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            <span className="text-sm font-medium">تعديل الملف الشخصي</span>
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
          </Link>
          {deletionStatus.hasPendingDeletion ? (
            <button
              onClick={() => setShowCountdownModal(true)}
              className="flex w-full items-center justify-between rounded-lg bg-orange-50 px-4 py-3 text-orange-600 transition-colors hover:bg-orange-100"
            >
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                <span className="text-sm font-medium">طلب حذف معلق</span>
              </div>
              <span className="text-xs">عرض التفاصيل</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex w-full items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-red-600 transition-colors hover:bg-red-100"
            >
              <span className="text-sm font-medium">حذف الحساب</span>
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // عرض قسم الملف الشخصي
  const renderProfileSection = () => {
    // عرض skeleton أثناء التحميل
    if (isLoadingProfile) {
      return (
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-gray-200" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded bg-gray-200" />
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-9 w-28 rounded-lg bg-gray-200" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-11 w-full rounded-lg bg-gray-200" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-11 w-full rounded-lg bg-gray-200" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-11 w-full rounded-lg bg-gray-200" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* حقل رفع الصورة المخفي */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {/* صورة الملف الشخصي */}
        <div className="flex items-center gap-6">
          <div className="relative">
            {isUploadingImage ? (
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-lg">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            ) : profileData.profileImage ? (
              <img
                src={profileData.profileImage}
                alt="صورة الملف الشخصي"
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <UserCircleIcon className="h-16 w-16 text-white" />
              </div>
            )}
            <button
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="تغيير الصورة"
            >
              <CameraIcon className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">صورة الملف الشخصي</h4>
            <p className="mb-2 text-sm text-gray-500">اختر صورة واضحة لملفك الشخصي (أقصى 5MB)</p>
            <button
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploadingImage ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  جاري الرفع...
                </span>
              ) : (
                'تغيير الصورة'
              )}
            </button>
          </div>
        </div>

        {/* الاسم */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            الاسم الكامل <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => updateProfileField('name', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="أدخل اسمك الكامل"
          />
        </div>

        {/* رقم الهاتف */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            رقم الهاتف <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => updateProfileField('phone', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-left transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="09XXXXXXXX"
            dir="ltr"
          />
          <p className="mt-1 text-xs text-gray-500">رقم الهاتف المستخدم لتسجيل الدخول والتواصل</p>
        </div>

        {/* البريد الإلكتروني (اختياري) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            البريد الإلكتروني <span className="text-gray-400">(اختياري)</span>
          </label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => updateProfileField('email', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-left transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="example@email.com"
            dir="ltr"
          />
        </div>

        {/* الموقع */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">المدينة</label>
          <select
            value={profileData.city}
            onChange={(e) => updateProfileField('city', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">اختر المدينة</option>
            <option value="tripoli">طرابلس</option>
            <option value="benghazi">بنغازي</option>
            <option value="misrata">مصراتة</option>
            <option value="zawiya">الزاوية</option>
            <option value="zliten">زليتن</option>
            <option value="khoms">الخمس</option>
            <option value="sabrata">صبراتة</option>
            <option value="gharyan">غريان</option>
            <option value="sirte">سرت</option>
            <option value="derna">درنة</option>
            <option value="tobruk">طبرق</option>
            <option value="other">مدينة أخرى</option>
          </select>
        </div>

        {/* النبذة التعريفية */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">نبذة تعريفية</label>
          <textarea
            rows={3}
            value={profileData.bio}
            onChange={(e) => updateProfileField('bio', e.target.value)}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="اكتب نبذة قصيرة عنك..."
            maxLength={500}
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>ستظهر هذه النبذة في ملفك الشخصي العام</span>
            <span>{profileData.bio.length}/500</span>
          </div>
        </div>

        {/* أزرار الحفظ */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-500">
            {hasChanges && (
              <span className="flex items-center gap-1 text-amber-600">
                <ExclamationTriangleIcon className="h-4 w-4" />
                لديك تغييرات غير محفوظة
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // إعادة تحميل البيانات الأصلية
                const savedUser = localStorage.getItem('user');
                if (savedUser) {
                  const user = JSON.parse(savedUser);
                  setProfileData({
                    name: user.name || '',
                    phone: user.phone || '',
                    email: user.email || '',
                    city: user.city || '',
                    bio: user.bio || '',
                    profileImage: user.profileImage || '',
                  });
                }
                setHasChanges(false);
              }}
              disabled={!hasChanges || isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              إلغاء التغييرات
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 font-medium text-white transition-all hover:from-blue-700 hover:to-cyan-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // عرض القسم النشط
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'password':
        return renderPasswordSection();
      case 'account':
        return renderAccountSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <>
      <Head>
        <title>الإعدادات | سوق مزاد</title>
        <meta name="description" content="إعدادات حسابك الشخصي" />
      </Head>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
            <p className="mt-1 text-sm text-gray-500">إدارة إعدادات حسابك الشخصي</p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Sidebar */}
            <div className="flex-shrink-0 lg:w-64">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <nav className="space-y-1 p-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-right transition-colors ${
                          isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-900'}`}
                          >
                            {section.title}
                          </p>
                          <p className="truncate text-xs text-gray-500">{section.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {sections.find((s) => s.id === activeSection)?.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {sections.find((s) => s.id === activeSection)?.description}
                    </p>
                  </div>
                </div>

                {renderActiveSection()}
              </div>

              {/* Save Button (للإعدادات غير كلمة المرور) */}
              {activeSection !== 'password' && hasChanges && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        <span>حفظ التغييرات</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal تأكيد حذف الحساب */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">تأكيد حذف الحساب</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="mb-4 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <p className="mb-4 text-center text-gray-600">
                هل أنت متأكد من رغبتك في حذف حسابك؟ سيتم حذف جميع بياناتك بعد{' '}
                <span className="font-bold text-red-600">30 يوم</span> من تأكيد الطلب.
              </p>
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                <p className="font-medium">ملاحظة مهمة:</p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  <li>يمكنك إلغاء الطلب في أي وقت خلال فترة الـ 30 يوم</li>
                  <li>سيتم حذف جميع إعلاناتك ومزاداتك ورسائلك</li>
                  <li>لن تتمكن من استعادة حسابك بعد الحذف النهائي</li>
                </ul>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                سبب حذف الحساب (اختياري)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="أخبرنا لماذا تريد حذف حسابك..."
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleRequestDeletion}
                disabled={isLoadingDeletion}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isLoadingDeletion ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>جاري التنفيذ...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    <span>تأكيد حذف الحساب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal العد التنازلي */}
      {showCountdownModal && deletionStatus.hasPendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">طلب حذف الحساب معلق</h3>
              <button
                onClick={() => setShowCountdownModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 text-center">
              <div className="mb-4 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                  <ClockIcon className="h-10 w-10 text-orange-600" />
                </div>
              </div>
              <p className="mb-2 text-gray-600">سيتم حذف حسابك بعد:</p>

              {/* العد التنازلي */}
              <div className="mb-4 grid grid-cols-4 gap-2">
                <div className="rounded-xl bg-gradient-to-b from-red-500 to-red-600 p-3 text-white shadow-lg">
                  <div className="text-3xl font-bold tabular-nums">{countdown.days}</div>
                  <div className="text-xs opacity-80">يوم</div>
                </div>
                <div className="rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 p-3 text-white shadow-lg">
                  <div className="text-3xl font-bold tabular-nums">{countdown.hours}</div>
                  <div className="text-xs opacity-80">ساعة</div>
                </div>
                <div className="rounded-xl bg-gradient-to-b from-yellow-500 to-yellow-600 p-3 text-white shadow-lg">
                  <div className="text-3xl font-bold tabular-nums">{countdown.minutes}</div>
                  <div className="text-xs opacity-80">دقيقة</div>
                </div>
                <div className="rounded-xl bg-gradient-to-b from-gray-500 to-gray-600 p-3 text-white shadow-lg">
                  <div className="text-3xl font-bold tabular-nums">{countdown.seconds}</div>
                  <div className="text-xs opacity-80">ثانية</div>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                تاريخ الحذف المجدول:{' '}
                <span className="font-medium text-gray-700">
                  {deletionStatus.scheduledDeletionAt
                    ? new Date(deletionStatus.scheduledDeletionAt).toLocaleDateString('ar-LY', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </span>
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium">هل غيرت رأيك؟</p>
              <p className="mt-1 text-blue-600">
                يمكنك إلغاء طلب الحذف في أي وقت قبل انتهاء المهلة والاستمرار في استخدام حسابك بشكل
                طبيعي.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCountdownModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                إغلاق
              </button>
              <button
                onClick={handleCancelDeletion}
                disabled={isLoadingDeletion}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {isLoadingDeletion ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>جاري الإلغاء...</span>
                  </>
                ) : (
                  <>
                    <XMarkIcon className="h-4 w-4" />
                    <span>إلغاء طلب الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // التحقق من تسجيل الدخول عبر الكوكيز أو الجلسة
  const token = context.req.cookies?.token || context.req.cookies?.['next-auth.session-token'];

  if (!token) {
    // إعادة توجيه للصفحة الرئيسية إذا لم يكن مسجل الدخول
    return {
      redirect: {
        destination: '/?callbackUrl=/settings',
        permanent: false,
      },
    };
  }

  // التحقق من صحة التوكن
  const user = await checkAuth(token);

  if (!user) {
    return {
      redirect: {
        destination: '/?callbackUrl=/settings',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
