/**
 * صفحة إدارة المزادات - محدّثة بالنظام الموحد
 * Auctions Management - Updated with Unified System
 */

import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import UnifiedActionsColumn from '../../../components/tables/UnifiedActionsColumn';
import {
  CommonFilters,
  SimpleToast,
  StatsPresets,
  UnifiedImage,
  UnifiedSearch,
  UnifiedStats,
  UnifiedTable,
  formatDate,
  formatPrice,
  getStatusClasses,
  getStatusConfig,
  parseImages,
  useSearchFilter,
  type TableColumn,
} from '../../../components/unified';

interface Auction {
  id: string;
  title: string;
  currentPrice: number;
  startingPrice: number;
  status: 'ACTIVE' | 'PENDING' | 'ENDED' | 'CANCELLED' | 'LIVE' | 'UPCOMING';
  bidsCount: number;
  endDate: string;
  createdAt: string;
  images: string[];
}

export default function AuctionsManagement() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // استخدام hook البحث والفلترة الموحد
  const { searchValue, setSearchValue, filters, setFilter, filteredData } = useSearchFilter({
    data: auctions,
    searchFields: ['title'],
    initialFilters: { status: 'all' },
  });

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auctions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.success && data.auctions) {
        const mappedAuctions = data.auctions.map(
          (a: {
            id: string;
            title: string;
            currentPrice: number;
            startPrice: number;
            status: string;
            bidsCount: number;
            endDate: string;
            createdAt: string;
            car?: { images?: unknown };
          }) => ({
            id: a.id,
            title: a.title || 'بدون عنوان',
            currentPrice: a.currentPrice || 0,
            startingPrice: a.startPrice || 0,
            status: (a.status || 'PENDING') as Auction['status'],
            bidsCount: a.bidsCount || 0,
            endDate: a.endDate || '',
            createdAt: a.createdAt || '',
            images: parseImages(a.car?.images),
          }),
        );
        setAuctions(mappedAuctions);
      } else {
        setAuctions([]);
      }
    } catch (err) {
      console.error('Failed to fetch auctions:', err);
      setToast({ text: 'فشل في تحميل المزادات', type: 'error' });
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // إيقاف المزاد
  const handleStopAuction = async (row: Auction) => {
    try {
      const res = await fetch(`/api/admin/auctions?id=${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ text: 'تم إيقاف المزاد بنجاح', type: 'success' });
        fetchAuctions();
      } else {
        setToast({ text: data.message || 'فشل في إيقاف المزاد', type: 'error' });
      }
    } catch {
      setToast({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    }
  };

  // حذف المزاد
  const handleDeleteAuction = async (row: Auction) => {
    try {
      const res = await fetch(`/api/admin/auctions?id=${row.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToast({ text: 'تم إلغاء المزاد بنجاح', type: 'success' });
        fetchAuctions();
      } else {
        setToast({ text: data.message || 'فشل في إلغاء المزاد', type: 'error' });
      }
    } catch {
      setToast({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    }
  };

  // تفعيل المزاد
  const handleActivateAuction = async (row: Auction) => {
    try {
      const res = await fetch(`/api/admin/auctions?id=${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ text: 'تم تفعيل المزاد بنجاح', type: 'success' });
        fetchAuctions();
      } else {
        setToast({ text: data.message || 'فشل في تفعيل المزاد', type: 'error' });
      }
    } catch {
      setToast({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  // حساب الإحصائيات
  const stats = StatsPresets.auctions({
    total: auctions.length,
    active: auctions.filter((a) => a.status === 'ACTIVE' || a.status === 'LIVE').length,
    ended: auctions.filter((a) => a.status === 'ENDED').length,
    pending: auctions.filter((a) => a.status === 'PENDING' || a.status === 'UPCOMING').length,
  });

  // تعريف أعمدة الجدول باستخدام النظام الموحد
  const columns: TableColumn<Auction>[] = [
    {
      id: 'auction',
      header: 'المزاد',
      accessor: 'title',
      type: 'custom',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <UnifiedImage
            src={row.images?.[0] || null}
            alt={row.title}
            config={{ size: 'sm', rounded: 'lg', fallbackIcon: 'car' }}
            showExtraCount={row.images.length > 1 ? row.images.length - 1 : undefined}
          />
          <div>
            <p className="font-medium text-white" title={row.title}>
              {String(value || '')}
            </p>
            <p className="text-xs text-slate-400">{row.bidsCount} مزايدة</p>
          </div>
        </div>
      ),
    },
    {
      id: 'currentPrice',
      header: 'السعر الحالي',
      accessor: 'currentPrice',
      type: 'custom',
      render: (value) => (
        <span className="font-semibold text-emerald-400">{formatPrice(Number(value))}</span>
      ),
    },
    {
      id: 'startingPrice',
      header: 'سعر البداية',
      accessor: 'startingPrice',
      type: 'custom',
      render: (value) => <span className="text-slate-300">{formatPrice(Number(value))}</span>,
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
      id: 'endDate',
      header: 'تاريخ الانتهاء',
      accessor: 'endDate',
      type: 'custom',
      render: (value) => <span className="text-slate-300">{formatDate(String(value))}</span>,
    },
    {
      id: 'createdAt',
      header: 'تاريخ الإنشاء',
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
          actions={[
            {
              type: 'view',
              href: (r) => `/admin/auctions/${r.id}`,
              tooltip: 'عرض التفاصيل',
            },
            {
              type: 'edit',
              href: (r) => `/admin/auctions/${r.id}/edit`,
              tooltip: 'تعديل المزاد',
            },
            {
              type: 'activate',
              onClick: handleActivateAuction,
              confirm: true,
              confirmTitle: 'تفعيل المزاد',
              confirmMessage: 'هل أنت متأكد من تفعيل هذا المزاد؟',
              tooltip: 'تفعيل المزاد',
              condition: (r) => r.status !== 'ACTIVE' && r.status !== 'LIVE',
            },
            {
              type: 'suspend',
              onClick: handleStopAuction,
              confirm: true,
              confirmTitle: 'إيقاف المزاد',
              confirmMessage: 'هل أنت متأكد من إيقاف هذا المزاد؟ سيتم إلغاؤه.',
              label: 'إيقاف',
              tooltip: 'إيقاف المزاد',
              condition: (r) => r.status === 'ACTIVE' || r.status === 'LIVE',
            },
            {
              type: 'delete',
              onClick: handleDeleteAuction,
              confirm: true,
              confirmTitle: 'إلغاء المزاد',
              confirmMessage: 'هل أنت متأكد من إلغاء هذا المزاد؟ لا يمكن التراجع عن هذا الإجراء.',
              tooltip: 'إلغاء المزاد',
            },
          ]}
          onActionComplete={fetchAuctions}
        />
      ),
    },
  ];

  return (
    <AdminLayout title="إدارة المزادات">
      {/* Toast */}
      <SimpleToast
        message={toast?.text || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      {/* Stats - النظام الموحد */}
      <UnifiedStats stats={stats} columns={4} className="mb-6" />

      {/* Header with Add Button */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">المزادات الأونلاين</h2>
            <p className="text-sm text-slate-400">المزادات على الموقع الإلكتروني (بدون ساحات)</p>
          </div>
          <Link
            href="/admin/auctions/create"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            إنشاء مزاد أونلاين
          </Link>
        </div>
        {/* رسالة توضيحية للتفريق بين الأقسام */}
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-200">
            لإدارة مزادات الساحات (المزادات الحضورية)، انتقل إلى قسم الساحات
          </p>
          <Link
            href="/admin/yards/auctions"
            className="text-sm font-medium text-amber-400 hover:text-amber-300 hover:underline"
          >
            مزادات الساحات
          </Link>
        </div>
      </div>

      {/* Search & Filter - النظام الموحد */}
      <UnifiedSearch
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث في المزادات..."
        filters={[
          {
            id: 'status',
            label: 'الحالة',
            value: filters.status || 'all',
            onChange: (v) => setFilter('status', v),
            options: CommonFilters.auctionStatus,
          },
        ]}
        onRefresh={fetchAuctions}
        className="mb-6"
      />

      {/* Table - النظام الموحد */}
      <UnifiedTable
        columns={columns}
        data={filteredData}
        loading={loading}
        emptyMessage="لا توجد مزادات"
        sortable={true}
      />
    </AdminLayout>
  );
}
