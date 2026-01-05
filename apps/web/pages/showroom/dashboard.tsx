import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import BuildingStorefrontIcon from '@heroicons/react/24/outline/BuildingStorefrontIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { OpensooqNavbar } from '../../components/common';
import ConfirmationModal from '../../components/common/ui/ConfirmationModal';
import AccountInfoCard from '../../components/showroom/dashboard/AccountInfoCard';
import ShowroomManagementCard from '../../components/showroom/dashboard/ShowroomManagementCard';
import useAuth from '../../hooks/useAuth';

interface ShowroomData {
  id: string;
  name: string;
  description: string;
  images: string[];
  phone?: string;
  email?: string;
  website?: string;
  city: string;
  area: string;
  address: string;
  rating: number;
  reviewsCount: number;
  totalCars: number;
  activeCars: number;
  verified: boolean;
  featured: boolean;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  vehicleTypes: string[];
  specialties: string[];
  openingHours?: string;
  establishedYear?: number;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  id: string;
  name: string;
  phone?: string;
  verified: boolean;
  accountType: string;
  profileImage?: string;
  rating?: number;
  totalReviews?: number;
  memberSince?: string;
}

const ShowroomDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [showrooms, setShowrooms] = useState<ShowroomData[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // التحقق من صلاحية الوصول
  useEffect(() => {
    if (!authLoading && (!user || user.accountType !== 'SHOWROOM')) {
      router.replace('/');
      return;
    }
  }, [user, authLoading, router]);

  // جلب البيانات
  useEffect(() => {
    if (user && user.accountType === 'SHOWROOM') {
      fetchShowrooms();
    }
  }, [user]);

  // تحديث البيانات عند العودة إلى الصفحة (مفيد بعد إنشاء معرض جديد)
  useEffect(() => {
    const handleFocus = () => {
      if (user && user.accountType === 'SHOWROOM' && !loading) {
        fetchShowrooms();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, loading]);

  // التحقق من رسالة النجاح عند القدوم من صفحة إنشاء المعرض
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'showroom-created') {
      setSuccessMessage('تم إنشاء المعرض بنجاح! قد يستغرق ظهوره بضع دقائق.');
      // إزالة المعامل من URL
      window.history.replaceState({}, '', window.location.pathname);
      // إخفاء الرسالة بعد 5 ثوان
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, []);

  const fetchShowrooms = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/showroom/my-showrooms?userId=${user?.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShowrooms(result.data.showrooms);
          setUserData({
            id: user?.id || '',
            name: result.data.user.name,
            phone: result.data.user.phone,
            verified: result.data.user.verified,
            accountType: user?.accountType || 'SHOWROOM',
            profileImage: user?.profileImage,
            memberSince: user?.createdAt ? new Date(user.createdAt).toISOString() : undefined,
          });
        } else {
          setError(result.error || 'فشل في تحميل البيانات');
        }
      } else {
        setError('فشل في تحميل البيانات');
      }
    } catch (err) {
      console.error('خطأ في جلب المعارض:', err);
      setError('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchShowrooms();
    setRefreshing(false);
  };

  const handleEditShowroom = (showroomId: string) => {
    router.push(`/showroom/edit/${showroomId}`);
  };

  const handleDeleteShowroom = (showroomId: string) => {
    const showroom = showrooms.find((s) => s.id === showroomId);
    setConfirmModal({
      isOpen: true,
      title: 'تأكيد حذف المعرض',
      message: `هل أنت متأكد من حذف معرض "${showroom?.name || 'غير محدد'}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      type: 'danger',
      onConfirm: () => confirmDeleteShowroom(showroomId),
    });
  };

  const confirmDeleteShowroom = async (showroomId: string) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    try {
      setActionLoading(showroomId);

      const response = await fetch('/api/showroom/my-showrooms', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showroomId,
          userId: user?.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowrooms((prev) => prev.filter((s) => s.id !== showroomId));
        setSuccessMessage('تم حذف المعرض بنجاح');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(result.error || 'فشل في حذف المعرض');
      }
    } catch (error) {
      console.error('خطأ في حذف المعرض:', error);
      alert('فشل في حذف المعرض');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleShowroomStatus = (showroomId: string, action: 'approve' | 'suspend') => {
    const showroom = showrooms.find((s) => s.id === showroomId);
    const actionText = action === 'approve' ? 'اعتماد' : 'تعليق';

    setConfirmModal({
      isOpen: true,
      title: `تأكيد ${actionText} المعرض`,
      message: `هل أنت متأكد من ${actionText} معرض "${showroom?.name || 'غير محدد'}"؟`,
      type: action === 'suspend' ? 'warning' : 'info',
      onConfirm: () => confirmToggleShowroomStatus(showroomId, action),
    });
  };

  const confirmToggleShowroomStatus = async (showroomId: string, action: 'approve' | 'suspend') => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    try {
      setActionLoading(showroomId);

      const response = await fetch('/api/showroom/my-showrooms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showroomId,
          action,
          userId: user?.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowrooms((prev) =>
          prev.map((s) =>
            s.id === showroomId
              ? {
                  ...s,
                  status: action === 'approve' ? 'APPROVED' : 'SUSPENDED',
                }
              : s,
          ),
        );
        setSuccessMessage(`تم ${action === 'approve' ? 'اعتماد' : 'تعليق'} المعرض بنجاح`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(result.error || 'فشل في تحديث المعرض');
      }
    } catch (error) {
      console.error('خطأ في تحديث المعرض:', error);
      alert('فشل في تحديث المعرض');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeatured = (showroomId: string) => {
    const showroom = showrooms.find((s) => s.id === showroomId);
    const actionText = showroom?.featured ? 'إلغاء تمييز' : 'تمييز';

    setConfirmModal({
      isOpen: true,
      title: `تأكيد ${actionText} المعرض`,
      message: `هل أنت متأكد من ${actionText} معرض "${showroom?.name || 'غير محدد'}"؟`,
      type: 'info',
      onConfirm: () => confirmToggleFeatured(showroomId),
    });
  };

  const confirmToggleFeatured = async (showroomId: string) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    try {
      setActionLoading(showroomId);

      const response = await fetch('/api/showroom/my-showrooms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showroomId,
          action: 'toggle_featured',
          userId: user?.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowrooms((prev) =>
          prev.map((s) => (s.id === showroomId ? { ...s, featured: !s.featured } : s)),
        );
        setSuccessMessage('تم تحديث حالة التمييز بنجاح');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(result.error || 'فشل في تحديث المعرض');
      }
    } catch (error) {
      console.error('خطأ في تحديث المعرض:', error);
      alert('فشل في تحديث المعرض');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-600" />
            <p className="mt-4 text-gray-600">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>لوحة تحكم المعرض | سوق مزاد</title>
        <meta name="description" content="لوحة تحكم المعرض - إدارة المعارض والسيارات" />
      </Head>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />

        <main className="mx-auto max-w-7xl px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">لوحة تحكم المعرض</h1>
            <p className="text-gray-600">إدارة معارضك وسياراتك</p>
          </div>

          {/* رسالة النجاح */}
          {successMessage && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="flex-shrink-0 text-green-600 hover:text-green-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* بطاقة معلومات الحساب */}
          {userData && (
            <div className="mb-8">
              <AccountInfoCard user={userData} onRefresh={handleRefresh} refreshing={refreshing} />
            </div>
          )}

          {/* قسم المعارض */}
          <div className="mb-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">معارضي</h2>
                <p className="text-gray-600">إدارة المعارض الخاصة بك</p>
              </div>

              <div className="flex items-center gap-3">
                {/* زر تحديث المعارض */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
                  title="تحديث قائمة المعارض"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>تحديث</span>
                </button>

                {/* زر إضافة معرض جديد */}
                <Link
                  href="/showroom/create"
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>إضافة معرض جديد</span>
                </Link>
              </div>
            </div>

            {/* عرض المعارض */}
            {showrooms.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-lg">
                <BuildingStorefrontIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <h3 className="mb-2 text-xl font-bold text-gray-900">لا توجد معارض</h3>
                <p className="mb-6 text-gray-600">
                  لم تقم بإنشاء أي معرض بعد. ابدأ بإنشاء معرضك الأول لعرض سياراتك.
                </p>
                <Link
                  href="/showroom/create"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>إنشاء معرض جديد</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {showrooms.map((showroom) => (
                  <ShowroomManagementCard
                    key={showroom.id}
                    showroom={showroom}
                    onEdit={handleEditShowroom}
                    onDelete={handleDeleteShowroom}
                    onToggleStatus={handleToggleShowroomStatus}
                    onToggleFeatured={handleToggleFeatured}
                    loading={actionLoading === showroom.id}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* نافذة التأكيد */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        loading={actionLoading !== null}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </>
  );
};

export default ShowroomDashboardPage;
