/**
 * صفحة إدارة خدمات النقل - محدّثة بالنظام الموحد
 * Transport Services Management - Updated with Unified System
 */

import { PlusIcon, StarIcon, TrashIcon, TruckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import UnifiedActionsColumn, {
  ActionPresets,
} from '../../../components/tables/UnifiedActionsColumn';
import {
  AnimatedPresence,
  AnimatedSection,
  CommonFilters,
  SERVICE_TYPE_LABELS,
  SimpleToast,
  StatsPresets,
  UnifiedSearch,
  UnifiedStats,
  UnifiedTable,
  formatDate,
  getStatusClasses,
  getStatusConfig,
  parseImages,
  useSearchFilter,
  type TableColumn,
} from '../../../components/unified';

interface TransportService {
  id: string;
  title: string;
  providerName: string;
  serviceType: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  rating: number;
  completedTrips: number;
  createdAt: string;
  images?: string[];
}

export default function TransportManagement() {
  const router = useRouter();
  const [services, setServices] = useState<TransportService[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedServices, setSelectedServices] = useState<TransportService[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // قراءة فلتر الحالة من URL
  const urlStatus = router.query.status as string | undefined;

  // استخدام hook البحث والفلترة الموحد
  const { searchValue, setSearchValue, filters, setFilter, filteredData } = useSearchFilter({
    data: services,
    searchFields: ['title', 'providerName'],
    initialFilters: { status: urlStatus || 'all' },
  });

  // تحديث الفلتر عند تغير URL
  useEffect(() => {
    if (urlStatus) {
      setFilter('status', urlStatus);
    }
  }, [urlStatus, setFilter]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transport');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.services) {
          setServices(
            data.services.map(
              (s: {
                id: string;
                title: string;
                provider?: { name: string };
                truckType: string;
                status: string;
                rating?: number;
                completedTrips?: number;
                createdAt: string;
                images?: string | string[];
              }) => ({
                id: s.id,
                title: s.title || 'بدون عنوان',
                providerName: s.provider?.name || 'غير معروف',
                serviceType: s.truckType || 'غير محدد',
                status: s.status as TransportService['status'],
                rating: s.rating || 0,
                completedTrips: s.completedTrips || 0,
                images: parseImages(s.images),
                createdAt: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '-',
              }),
            ),
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setToast({ text: 'فشل تحميل الخدمات', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/transport?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ text: 'تم حذف الخدمة بنجاح', type: 'success' });
        // إزالة الخدمة من التحديد إذا كانت محددة
        setSelectedServices((prev) => prev.filter((s) => s.id !== id));
        fetchServices();
      }
    } catch (err) {
      console.error('Failed to delete service:', err);
      setToast({ text: 'فشل حذف الخدمة', type: 'error' });
    }
  };

  // حذف متعدد
  const handleBulkDelete = async () => {
    if (selectedServices.length === 0) return;

    setBulkDeleteLoading(true);
    try {
      const ids = selectedServices.map((s) => s.id);
      const res = await fetch('/api/admin/transport', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (res.ok) {
        const data = await res.json();
        setToast({
          text: `تم حذف ${data.deletedCount || selectedServices.length} خدمة بنجاح`,
          type: 'success',
        });
        setSelectedServices([]);
        setShowDeleteConfirm(false);
        fetchServices();
      } else {
        const error = await res.json();
        setToast({ text: error.message || 'فشل حذف الخدمات', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      setToast({ text: 'فشل حذف الخدمات', type: 'error' });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'ACTIVE' | 'INACTIVE') => {
    try {
      const res = await fetch(`/api/admin/transport?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setToast({
          text: newStatus === 'ACTIVE' ? 'تم تفعيل الخدمة' : 'تم تعليق الخدمة',
          type: 'success',
        });
        fetchServices();
      }
    } catch (err) {
      console.error('Failed to update service:', err);
      setToast({ text: 'فشل تحديث الخدمة', type: 'error' });
    }
  };

  // حساب الإحصائيات
  const stats = StatsPresets.transport({
    total: services.length,
    active: services.filter((s) => s.status === 'ACTIVE').length,
    inactive: services.filter((s) => s.status === 'INACTIVE').length,
    pending: services.filter((s) => s.status === 'PENDING').length,
  });

  // تعريف أعمدة الجدول باستخدام النظام الموحد
  const columns: TableColumn<TransportService>[] = [
    {
      id: 'images',
      header: 'الصور',
      accessor: 'images',
      type: 'image',
      imageConfig: { size: 'md', rounded: 'lg', showCount: true, fallbackIcon: 'truck' },
    },
    {
      id: 'service',
      header: 'معلومات الخدمة',
      accessor: 'title',
      type: 'custom',
      render: (value, row) => {
        const shortTitle = String(value || '');
        return (
          <div>
            <p className="font-medium text-white" title={row.title}>
              {shortTitle}
            </p>
            <p className="text-xs text-slate-400">{row.providerName}</p>
          </div>
        );
      },
    },
    {
      id: 'serviceType',
      header: 'نوع الخدمة',
      accessor: 'serviceType',
      type: 'custom',
      render: (value) => (
        <div className="flex items-center gap-2">
          <TruckIcon className="h-4 w-4 text-slate-400" />
          <span className="text-slate-300">
            {SERVICE_TYPE_LABELS[String(value)] || String(value)}
          </span>
        </div>
      ),
    },
    {
      id: 'rating',
      header: 'التقييم',
      accessor: 'rating',
      type: 'custom',
      render: (value) => (
        <div className="flex items-center gap-1">
          <StarIcon className="h-4 w-4 text-yellow-400" />
          <span className="text-slate-300">{Number(value).toFixed(1)}</span>
        </div>
      ),
    },
    {
      id: 'completedTrips',
      header: 'الرحلات المكتملة',
      accessor: 'completedTrips',
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
      type: 'custom',
      render: (value) => (
        <span className="text-sm text-slate-400">{formatDate(String(value))}</span>
      ),
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      accessor: 'id',
      type: 'custom',
      sortable: false,
      render: (_, row) => (
        <UnifiedActionsColumn
          row={row}
          actions={ActionPresets.transport({
            viewHref: (r) => `/admin/transport/${r.id}`,
            editHref: (r) => `/admin/transport/${r.id}/edit`,
            onActivate:
              row.status !== 'ACTIVE' ? (r) => handleStatusChange(r.id, 'ACTIVE') : undefined,
            onSuspend:
              row.status === 'ACTIVE' ? (r) => handleStatusChange(r.id, 'INACTIVE') : undefined,
            onDelete: (r) => handleDelete(r.id),
          })}
          onActionComplete={fetchServices}
        />
      ),
    },
  ];

  return (
    <AdminLayout title="إدارة خدمات النقل">
      <AnimatedSection delay={60}>
        <SimpleToast
          message={toast?.text || null}
          type={toast?.type}
          onClose={() => setToast(null)}
        />
      </AnimatedSection>

      <AnimatedSection delay={120}>
        <UnifiedStats stats={stats} columns={4} className="mb-6" />
      </AnimatedSection>

      <AnimatedSection delay={180}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">قائمة خدمات النقل</h2>
            {selectedServices.length > 0 && (
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-400">
                {selectedServices.length} محدد
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedServices.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                <TrashIcon className="h-5 w-5" />
                حذف المحدد ({selectedServices.length})
              </button>
            )}
            <Link
              href="/admin/transport/add"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              إضافة خدمة
            </Link>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={220}>
        <UnifiedSearch
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="البحث في خدمات النقل..."
          filters={[
            {
              id: 'status',
              label: 'الحالة',
              value: filters.status || 'all',
              onChange: (v) => setFilter('status', v),
              options: CommonFilters.status,
            },
          ]}
          onRefresh={fetchServices}
          className="mb-6"
        />
      </AnimatedSection>

      <AnimatedSection delay={260}>
        <UnifiedTable
          columns={columns}
          data={filteredData}
          loading={loading}
          emptyMessage="لا توجد خدمات نقل"
          sortable={true}
          selectable={true}
          selectedRows={selectedServices}
          onSelectionChange={setSelectedServices}
        />
      </AnimatedSection>

      <AnimatedPresence show={showDeleteConfirm}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-slate-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">تأكيد حذف الخدمات</h3>
            <p className="mb-6 text-slate-400">
              هل أنت متأكد من حذف {selectedServices.length} خدمة؟
              <br />
              <span className="text-sm text-yellow-400">
                سيتم تعطيل هذه الخدمات ولن تظهر للمستخدمين.
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={bulkDeleteLoading}
                className="rounded-lg bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleteLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-5 w-5" />
                    تأكيد الحذف
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </AnimatedPresence>
    </AdminLayout>
  );
}
