/**
 * صفحة إدارة السوق الفوري - محدّثة بالنظام الموحد
 * Marketplace Management - Updated with Unified System
 */
import {
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import {
  CommonFilters,
  SimpleToast,
  StatsPresets,
  UnifiedImage,
  UnifiedSearch,
  UnifiedStats,
  UnifiedTable,
  formatPrice,
  getStatusClasses,
  getStatusConfig,
  parseImages,
  useSearchFilter,
  type TableColumn,
} from '../../../components/unified';

interface Listing {
  id: string;
  title: string;
  seller: string;
  sellerId?: string;
  price: number;
  category: string;
  status: 'ACTIVE' | 'PENDING' | 'SOLD' | 'EXPIRED';
  featured: boolean;
  views: number;
  createdAt: string;
  images?: string[];
}

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; listing: Listing | null }>({
    open: false,
    listing: null,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // قراءة معامل featured من URL
  const showFeaturedOnly = router.query.featured === 'true';

  // استخدام hook البحث والفلترة الموحد
  const { searchValue, setSearchValue, filters, setFilter, filteredData } = useSearchFilter({
    data: listings,
    searchFields: ['title', 'seller'],
    initialFilters: { status: 'all' },
  });

  // تحويل حالات قاعدة البيانات إلى حالات العرض
  const mapStatus = (status: string): Listing['status'] => {
    const statusMap: Record<string, Listing['status']> = {
      AVAILABLE: 'ACTIVE',
      SOLD: 'SOLD',
      PENDING: 'PENDING', // قيد المراجعة - من قاعدة البيانات
      DRAFT: 'PENDING', // مسودة - تعرض كقيد المراجعة
      REJECTED: 'EXPIRED', // مرفوض - يعرض كمنتهي
    };
    return statusMap[status] || 'PENDING';
  };

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      // إضافة معامل featured للـ API إذا كان مطلوب
      const apiUrl = showFeaturedOnly
        ? '/api/admin/marketplace?featured=true'
        : '/api/admin/marketplace';
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.listings) {
          setListings(
            data.listings.map(
              (item: {
                id: string;
                title: string;
                seller: string;
                price: number;
                category: string;
                status: string;
                featured: boolean;
                views: number;
                createdAt: string;
                images?: string | string[];
              }) => ({
                id: item.id,
                title: item.title || 'بدون عنوان',
                seller: item.seller || 'غير معروف',
                price: item.price || 0,
                category: item.category || 'سيارات',
                status: mapStatus(item.status),
                featured: item.featured || false,
                views: item.views || 0,
                images: parseImages(item.images),
                createdAt: item.createdAt
                  ? new Date(item.createdAt).toISOString().split('T')[0]
                  : '-',
              }),
            ),
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      setToast({ text: 'فشل تحميل الإعلانات', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showFeaturedOnly]);

  useEffect(() => {
    // انتظار تحميل معاملات URL
    if (router.isReady) {
      fetchListings();
    }
  }, [fetchListings, router.isReady]);

  // حساب الإحصائيات
  const stats = StatsPresets.marketplace({
    total: listings.length,
    active: listings.filter((l) => l.status === 'ACTIVE').length,
    sold: listings.filter((l) => l.status === 'SOLD').length,
    featured: listings.filter((l) => l.featured).length,
  });

  // عرض الإعلان
  const handleView = (listing: Listing) => {
    window.open(`http://localhost:3021/marketplace/${listing.id}`, '_blank');
  };

  // تعديل الإعلان
  const handleEdit = (listing: Listing) => {
    router.push(`/admin/marketplace/preview?id=${listing.id}`);
  };

  // فتح نافذة تأكيد الحذف
  const handleDeleteClick = (listing: Listing) => {
    setDeleteModal({ open: true, listing });
  };

  // تأكيد الحذف
  const confirmDelete = async () => {
    if (!deleteModal.listing) return;

    setActionLoading(deleteModal.listing.id);
    try {
      const res = await fetch(`/api/admin/marketplace?id=${deleteModal.listing.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setListings((prev) => prev.filter((l) => l.id !== deleteModal.listing?.id));
        setToast({ text: 'تم حذف الإعلان بنجاح', type: 'success' });
      } else {
        setToast({ text: data.message || 'فشل في حذف الإعلان', type: 'error' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setToast({ text: 'حدث خطأ أثناء الحذف', type: 'error' });
    } finally {
      setActionLoading(null);
      setDeleteModal({ open: false, listing: null });
    }
  };

  // تبديل حالة المميز
  const toggleFeatured = async (listing: Listing) => {
    setActionLoading(listing.id);
    try {
      const res = await fetch(`/api/admin/marketplace?id=${listing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !listing.featured }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setListings((prev) =>
          prev.map((l) => (l.id === listing.id ? { ...l, featured: !l.featured } : l)),
        );
        setToast({
          text: listing.featured ? 'تم إزالة الإعلان من المميزة' : 'تم إضافة الإعلان للمميزة',
          type: 'success',
        });
      } else {
        setToast({ text: data.message || 'فشل في تحديث الإعلان', type: 'error' });
      }
    } catch (error) {
      console.error('Toggle featured error:', error);
      setToast({ text: 'حدث خطأ أثناء التحديث', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // تعريف أعمدة الجدول باستخدام النظام الموحد
  const columns: TableColumn<Listing>[] = [
    {
      id: 'product',
      header: 'الإعلان',
      accessor: 'title',
      type: 'custom',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <UnifiedImage
            src={row.images?.[0] || null}
            alt={row.title}
            config={{ size: 'sm', rounded: 'lg', fallbackIcon: 'car' }}
            showExtraCount={row.images && row.images.length > 1 ? row.images.length - 1 : undefined}
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white" title={row.title}>
                {String(value || '')}
              </p>
              {row.featured && <StarIconSolid className="h-4 w-4 text-yellow-400" />}
            </div>
            <p className="text-xs text-slate-400">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'seller',
      header: 'البائع',
      accessor: 'seller',
      type: 'text',
    },
    {
      id: 'price',
      header: 'السعر',
      accessor: 'price',
      type: 'custom',
      render: (value) => (
        <span className="font-medium text-emerald-400">{formatPrice(Number(value))}</span>
      ),
    },
    {
      id: 'views',
      header: 'المشاهدات',
      accessor: 'views',
      type: 'text',
    },
    {
      id: 'status',
      header: 'الحالة',
      accessor: 'status',
      type: 'custom',
      render: (value) => {
        const status = String(value || '');
        const config = getStatusConfig(status);
        return (
          <span className={`rounded-full border px-2.5 py-1 text-xs ${getStatusClasses(status)}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      id: 'createdAt',
      header: 'التاريخ',
      accessor: 'createdAt',
      type: 'date',
    },
    {
      id: 'actions',
      header: 'إجراءات',
      accessor: 'id',
      type: 'custom',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleFeatured(row)}
            disabled={actionLoading === row.id}
            title={row.featured ? 'إزالة من المميزة' : 'إضافة للمميزة'}
            className={`rounded p-1.5 transition-colors ${
              row.featured
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'text-slate-400 hover:bg-slate-600 hover:text-yellow-400'
            }`}
          >
            {row.featured ? (
              <StarIconSolid className="h-5 w-5" />
            ) : (
              <StarIcon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => handleView(row)}
            title="عرض الإعلان"
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-500/20 hover:text-blue-400"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleEdit(row)}
            title="تعديل الإعلان"
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-green-500/20 hover:text-green-400"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            disabled={actionLoading === row.id}
            title="حذف الإعلان"
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="إدارة السوق الفوري">
      {/* Toast */}
      <SimpleToast
        message={toast?.text || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      {/* Stats - النظام الموحد */}
      <UnifiedStats stats={stats} columns={4} className="mb-6" />

      {/* Header with Buttons */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">
            {showFeaturedOnly ? 'الإعلانات المميزة' : 'قائمة الإعلانات'}
          </h2>
          {showFeaturedOnly && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-400">
              <StarIconSolid className="h-4 w-4" />
              مميزة فقط
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {showFeaturedOnly ? (
            <Link
              href="/admin/marketplace"
              className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-500"
            >
              عرض الكل
            </Link>
          ) : (
            <Link
              href="/admin/marketplace?featured=true"
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition-colors hover:bg-purple-700"
            >
              <StarIcon className="h-5 w-5" />
              المميزة
            </Link>
          )}
          <Link
            href="/admin/marketplace/create?type=instant"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
          >
            <PlusIcon className="h-5 w-5" />
            إنشاء إعلان
          </Link>
        </div>
      </div>

      {/* رسالة توضيحية للصفحة المميزة */}
      {showFeaturedOnly && listings.length === 0 && !loading && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-yellow-400">
            لا توجد إعلانات مميزة حالياً. يمكنك تمييز إعلان بالنقر على أيقونة النجمة ⭐
          </p>
        </div>
      )}

      {/* Search & Filter - النظام الموحد */}
      <UnifiedSearch
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث في الإعلانات..."
        filters={[
          {
            id: 'status',
            label: 'الحالة',
            value: filters.status || 'all',
            onChange: (v) => setFilter('status', v),
            options: CommonFilters.listingStatus,
          },
        ]}
        onRefresh={fetchListings}
        className="mb-6"
      />

      {/* Table - النظام الموحد */}
      <UnifiedTable
        columns={columns}
        data={filteredData}
        loading={loading}
        emptyMessage={showFeaturedOnly ? 'لا توجد إعلانات مميزة' : 'لا توجد إعلانات'}
        sortable={true}
      />

      <ConfirmDialog
        open={deleteModal.open && !!deleteModal.listing}
        title="تأكيد الحذف"
        message={
          deleteModal.listing && (
            <div className="space-y-3">
              <p>هل أنت متأكد من حذف هذا الإعلان؟</p>
              <p className="rounded-lg bg-slate-700/50 p-3 text-sm text-white">
                {deleteModal.listing.title}
              </p>
            </div>
          )
        }
        variant="danger"
        confirmLabel="تأكيد الحذف"
        cancelLabel="إلغاء"
        loading={!!deleteModal.listing && actionLoading === deleteModal.listing.id}
        onCancel={() => setDeleteModal({ open: false, listing: null })}
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
}
