/**
 * صفحة إدارة المعارض - محدّثة بالنظام الموحد
 * Showrooms Management - Updated with Unified System
 */
import {
  CheckBadgeIcon,
  EyeIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import {
  SimpleToast,
  StatsPresets,
  UnifiedImage,
  UnifiedSearch,
  UnifiedStats,
  UnifiedTable,
  formatDate,
  formatPhoneNumber,
  getStatusClasses,
  getStatusConfig,
  parseImages,
  useSearchFilter,
  type TableColumn,
} from '../../../components/unified';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

interface Showroom {
  id: string;
  name: string;
  owner: string;
  phone: string;
  city: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  carsCount: number;
  verified: boolean;
  createdAt: string;
  logo?: string;
  images?: string[];
}

// خيارات فلترة المعارض
const showroomStatusOptions = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'APPROVED', label: 'معتمد' },
  { value: 'PENDING', label: 'قيد المراجعة' },
  { value: 'REJECTED', label: 'مرفوض' },
  { value: 'SUSPENDED', label: 'موقوف' },
];

export default function ShowroomsPage() {
  const router = useRouter();
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; showroom: Showroom | null }>({
    open: false,
    showroom: null,
  });

  // استخدام hook البحث والفلترة الموحد
  const { searchValue, setSearchValue, filters, setFilter, filteredData } = useSearchFilter({
    data: showrooms,
    searchFields: ['name', 'owner', 'city'],
    initialFilters: { status: 'all' },
  });

  const fetchShowrooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/showrooms');
      if (res.ok) {
        const data = await res.json();
        setShowrooms(
          (data.showrooms || []).map(
            (s: Showroom & { logo?: string; images?: string | string[] }) => ({
              ...s,
              logo: s.logo,
              images: parseImages(s.images),
            }),
          ),
        );
      }
    } catch (err) {
      console.error('Failed to fetch showrooms:', err);
      setToast({ text: 'فشل تحميل المعارض', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShowrooms();
  }, [fetchShowrooms]);

  const handleDelete = async () => {
    if (!deleteModal.showroom) return;
    try {
      const res = await fetch(`/api/admin/showrooms?id=${deleteModal.showroom.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToast({ text: 'تم حذف المعرض بنجاح', type: 'success' });
        fetchShowrooms();
      } else {
        setToast({ text: 'فشل حذف المعرض', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to delete showroom:', err);
      setToast({ text: 'فشل حذف المعرض', type: 'error' });
    } finally {
      setDeleteModal({ open: false, showroom: null });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/showrooms?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setToast({ text: 'تم تحديث حالة المعرض', type: 'success' });
        fetchShowrooms();
      }
    } catch (err) {
      console.error('Failed to update showroom:', err);
      setToast({ text: 'فشل تحديث المعرض', type: 'error' });
    }
  };

  // حساب الإحصائيات
  const stats = StatsPresets.showrooms({
    total: showrooms.length,
    active: showrooms.filter((s) => s.status === 'APPROVED').length,
    pending: showrooms.filter((s) => s.status === 'PENDING').length,
    featured: showrooms.filter((s) => s.verified).length,
  });

  // تعريف أعمدة الجدول باستخدام النظام الموحد
  const columns: TableColumn<Showroom>[] = [
    {
      id: 'showroom',
      header: 'المعرض',
      accessor: 'name',
      type: 'custom',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <UnifiedImage
            src={row.logo || row.images?.[0] || null}
            alt={row.name}
            config={{ size: 'sm', rounded: 'lg', fallbackIcon: 'building' }}
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{row.name}</p>
              {row.verified && <CheckBadgeIcon className="h-4 w-4 text-blue-400" />}
            </div>
            <p className="text-xs text-slate-400">{row.owner}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'الهاتف',
      accessor: 'phone',
      type: 'custom',
      render: (value) => (
        <span className="text-slate-300" dir="ltr">
          {formatPhoneNumber(String(value || ''))}
        </span>
      ),
    },
    {
      id: 'city',
      header: 'المدينة',
      accessor: 'city',
      type: 'custom',
      render: (value) => (
        <div className="flex items-center gap-1">
          <MapPinIcon className="h-4 w-4 text-slate-400" />
          <span className="text-slate-300">{String(value)}</span>
        </div>
      ),
    },
    {
      id: 'carsCount',
      header: 'عدد السيارات',
      accessor: 'carsCount',
      type: 'custom',
      render: (value) => <span className="font-medium text-blue-400">{Number(value)}</span>,
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
      type: 'custom',
      render: (value) => (
        <span className="text-sm text-slate-400">{formatDate(String(value))}</span>
      ),
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
            onClick={() => router.push(`/admin/showrooms/${row.id}`)}
            title="عرض"
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-500/20 hover:text-blue-400"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.push(`/admin/showrooms/${row.id}/edit`)}
            title="تعديل"
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-green-500/20 hover:text-green-400"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setDeleteModal({ open: true, showroom: row })}
            title="حذف"
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="إدارة المعارض">
      {/* Toast */}
      <SimpleToast
        message={toast?.text || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      {/* Stats - النظام الموحد */}
      <UnifiedStats stats={stats} columns={4} className="mb-6" />

      {/* Header with Add Button */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">قائمة المعارض</h2>
        <Link
          href="/admin/showrooms/create"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          إضافة معرض
        </Link>
      </div>

      {/* Search & Filter - النظام الموحد */}
      <UnifiedSearch
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث في المعارض..."
        filters={[
          {
            id: 'status',
            label: 'الحالة',
            value: filters.status || 'all',
            onChange: (v) => setFilter('status', v),
            options: showroomStatusOptions,
          },
        ]}
        onRefresh={fetchShowrooms}
        className="mb-6"
      />

      {/* Table - النظام الموحد */}
      <UnifiedTable
        columns={columns}
        data={filteredData}
        loading={loading}
        emptyMessage="لا توجد معارض"
        sortable={true}
      />

      <ConfirmDialog
        open={deleteModal.open && !!deleteModal.showroom}
        title="تأكيد الحذف"
        message={
          deleteModal.showroom && (
            <div className="space-y-3">
              <p>هل أنت متأكد من حذف هذا المعرض؟</p>
              <p className="rounded-lg bg-slate-700/50 p-3 text-sm text-white">
                {deleteModal.showroom.name}
              </p>
            </div>
          )
        }
        variant="danger"
        confirmLabel="تأكيد الحذف"
        cancelLabel="إلغاء"
        onCancel={() => setDeleteModal({ open: false, showroom: null })}
        onConfirm={handleDelete}
      />
    </AdminLayout>
  );
}
