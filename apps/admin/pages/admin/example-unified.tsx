/**
 * 🎯 صفحة مثالية - استخدام النظام الموحد
 * Example Page - Using Unified System
 *
 * هذه الصفحة توضح كيفية استخدام جميع المكونات الموحدة
 * يمكنك نسخ هذا الكود لإنشاء صفحات جديدة
 */

import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import UnifiedActionsColumn, { ActionPresets } from '../../components/tables/UnifiedActionsColumn';
import {
  ColumnPresets,
  CommonFilters,
  SimpleToast,
  StatsPresets,
  UnifiedImage,
  UnifiedSearch,
  UnifiedStats,
  UnifiedTable,
  parseImages,
  useSearchFilter,
  type ImageableEntity,
  type TableColumn,
} from '../../components/unified';

// ================== Types ==================

interface ExampleItem extends ImageableEntity {
  id: string;
  title: string;
  images: string[];
  status: 'ACTIVE' | 'PENDING' | 'ENDED' | 'CANCELLED';
  price: number;
  seller: string;
  sellerImage?: string;
  createdAt: string;
  views: number;
}

// ================== Mock Data ==================

const MOCK_DATA: ExampleItem[] = [
  {
    id: '1',
    title: 'سيارة BMW X5 2023',
    images: [
      '/uploads/auctions/auction_1764488601667.webp',
      '/uploads/auctions/auction_1764488601989.png',
    ],
    status: 'ACTIVE',
    price: 150000,
    seller: 'أحمد محمد',
    sellerImage: '/avatars/user1.jpg',
    createdAt: '2024-12-01',
    views: 250,
  },
  {
    id: '2',
    title: 'مرسيدس GLC 2022',
    images: ['/uploads/auctions/auction_1764551261259.jpg'],
    status: 'PENDING',
    price: 180000,
    seller: 'محمود علي',
    createdAt: '2024-11-28',
    views: 120,
  },
  {
    id: '3',
    title: 'تويوتا كامري 2024',
    images: [],
    status: 'ENDED',
    price: 95000,
    seller: 'سالم أحمد',
    createdAt: '2024-11-20',
    views: 450,
  },
  {
    id: '4',
    title: 'نيسان باترول 2023',
    images: [
      '/uploads/auctions/auction_1764373433256.webp',
      '/uploads/auctions/auction_1764373433582.png',
      '/uploads/auctions/auction_1764373433903.jpg',
    ],
    status: 'ACTIVE',
    price: 220000,
    seller: 'خالد محمد',
    createdAt: '2024-12-02',
    views: 180,
  },
];

// ================== Page Component ==================

export default function ExampleUnifiedPage() {
  // States
  const [data, setData] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter Hook
  const { searchValue, setSearchValue, filters, setFilter, filteredData } = useSearchFilter({
    data,
    searchFields: ['title', 'seller'],
    initialFilters: { status: 'all' },
  });

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setData(MOCK_DATA);
    } catch (err) {
      setMessage({ text: 'فشل تحميل البيانات', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate Stats
  const stats = StatsPresets.auctions({
    total: data.length,
    active: data.filter((item) => item.status === 'ACTIVE').length,
    ended: data.filter((item) => item.status === 'ENDED').length,
    pending: data.filter((item) => item.status === 'PENDING').length,
  });

  // Table Columns - مثال على كيفية تعريف الأعمدة
  const columns: TableColumn<ExampleItem>[] = [
    // عمود الصورة مع العنوان (مخصص)
    {
      id: 'product',
      header: 'المنتج',
      accessor: 'title',
      type: 'custom',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <UnifiedImage
            src={row}
            alt={row.title}
            config={{ size: 'sm', rounded: 'lg', fallbackIcon: 'car', showCount: true }}
            showExtraCount={
              parseImages(row.images).length > 1 ? parseImages(row.images).length - 1 : undefined
            }
          />
          <div>
            <p className="font-medium text-white" title={row.title}>
              {String(value || '')}
            </p>
            <p className="text-xs text-slate-400">{row.views} مشاهدة</p>
          </div>
        </div>
      ),
    },
    // عمود البائع
    {
      id: 'seller',
      header: 'البائع',
      accessor: 'seller',
      type: 'text',
    },
    // عمود الحالة (جاهز)
    ColumnPresets.status<ExampleItem>('الحالة'),
    // عمود السعر (جاهز)
    ColumnPresets.price<ExampleItem>('price', 'السعر'),
    // عمود التاريخ (جاهز)
    ColumnPresets.date<ExampleItem>('createdAt', 'التاريخ'),
    // عمود الإجراءات
    {
      id: 'actions',
      header: 'الإجراءات',
      accessor: 'id',
      type: 'custom',
      sortable: false,
      render: (_, row) => (
        <UnifiedActionsColumn
          row={row}
          actions={ActionPresets.auctions({
            viewHref: (r) => `/admin/auctions/${r.id}`,
            editHref: (r) => `/admin/auctions/${r.id}/edit`,
            onDelete: (r) => handleDelete(r.id),
          })}
          onActionComplete={fetchData}
        />
      ),
    },
  ];

  // Handlers
  const handleDelete = async (id: string) => {
    setMessage({ text: `تم حذف العنصر ${id}`, type: 'success' });
    setData((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <AdminLayout title="صفحة مثالية - النظام الموحد">
      {/* Toast Message */}
      <SimpleToast
        message={message?.text || null}
        type={message?.type}
        onClose={() => setMessage(null)}
      />

      {/* Stats Section */}
      <UnifiedStats stats={stats} columns={4} className="mb-6" />

      {/* Header with Add Button */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">قائمة العناصر</h2>
        <Link
          href="/admin/auctions/create"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          إضافة جديد
        </Link>
      </div>

      {/* Search & Filter */}
      <UnifiedSearch
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="ابحث بالعنوان أو البائع..."
        filters={[
          {
            id: 'status',
            label: 'الحالة',
            value: filters.status || 'all',
            onChange: (v) => setFilter('status', v),
            options: CommonFilters.auctionStatus,
          },
        ]}
        onRefresh={fetchData}
        className="mb-6"
      />

      {/* Data Table */}
      <UnifiedTable
        columns={columns}
        data={filteredData}
        loading={loading}
        emptyMessage="لا توجد بيانات للعرض"
        sortable={true}
      />

      {/* Documentation Note */}
      <div className="mt-8 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
        <h3 className="mb-2 font-semibold text-blue-400">📘 ملاحظة للمطورين</h3>
        <p className="text-sm text-blue-300/80">
          هذه الصفحة توضح كيفية استخدام النظام الموحد. يمكنك نسخ هذا الكود كقالب لإنشاء صفحات جديدة.
          راجع الدليل الكامل في:{' '}
          <code className="rounded bg-blue-500/20 px-1">docs/UNIFIED_SYSTEM_GUIDE.md</code>
        </p>
      </div>
    </AdminLayout>
  );
}
