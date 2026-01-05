/**
 * صفحة إدارة المديرين - محدّثة بالنظام الموحد
 * Admins Management - Updated with Unified System
 */

import { PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import UnifiedActionsColumn, {
  ActionPresets,
} from '../../../components/tables/UnifiedActionsColumn';
import {
  AnimatedSection,
  SimpleToast,
  UnifiedSearch,
  UnifiedStats,
  UnifiedTable,
  UserAvatar,
  formatDate,
  getStatusClasses,
  getStatusConfig,
  useSearchFilter,
  type StatCard,
  type TableColumn,
} from '../../../components/unified';

interface Admin {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support' | 'finance' | 'viewer';
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin: string;
  createdAt: string;
  permissions?: string[];
  profileImage?: string;
}

// تسميات الأدوار
const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير عام',
  admin: 'مدير',
  moderator: 'مشرف',
  support: 'دعم فني',
  finance: 'مالي',
  viewer: 'مشاهد',
};

// خيارات فلترة الحالة
const statusOptions = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'INACTIVE', label: 'غير نشط' },
];

// خيارات فلترة الدور
const roleOptions = [
  { value: 'all', label: 'جميع الأدوار' },
  { value: 'super_admin', label: 'مدير عام' },
  { value: 'admin', label: 'مدير' },
  { value: 'moderator', label: 'مشرف' },
  { value: 'support', label: 'دعم فني' },
  { value: 'finance', label: 'مالي' },
  { value: 'viewer', label: 'مشاهد' },
];

export default function AdminsManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // استخدام hook البحث والفلترة الموحد
  const { searchValue, setSearchValue, filters, setFilter, filteredData } = useSearchFilter({
    data: admins,
    searchFields: ['name', 'username'],
    initialFilters: { status: 'all', role: 'all' },
  });

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/admins');
      if (res.ok) {
        const data = await res.json();
        const formattedAdmins = (data.admins || []).map(
          (admin: {
            id: string;
            name: string;
            username: string;
            role: string;
            status: string;
            is_active?: boolean;
            last_login?: string;
            created_at?: string;
            profileImage?: string;
          }) => ({
            id: admin.id,
            name: admin.name || 'بدون اسم',
            username: admin.username,
            role: admin.role?.toLowerCase() || 'moderator',
            status: admin.status || (admin.is_active ? 'ACTIVE' : 'INACTIVE'),
            lastLogin: admin.last_login || '',
            createdAt: admin.created_at || '',
            profileImage: admin.profileImage,
          }),
        );
        setAdmins(formattedAdmins);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      setToast({ text: 'فشل تحميل المديرين', type: 'error' });
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/admins?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: 'تم حذف المدير بنجاح', type: 'success' });
        fetchAdmins();
      } else {
        setToast({ text: data.message || 'فشل حذف المدير', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to delete admin:', err);
      setToast({ text: 'فشل حذف المدير', type: 'error' });
    }
  };

  const handleToggleStatus = async (admin: Admin) => {
    const newStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/admins?id=${admin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setToast({
          text: newStatus === 'ACTIVE' ? 'تم تفعيل المدير' : 'تم تعطيل المدير',
          type: 'success',
        });
        fetchAdmins();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setToast({ text: 'فشل تحديث حالة المدير', type: 'error' });
    }
  };

  // حساب الإحصائيات
  const stats: StatCard[] = [
    {
      id: 'total',
      label: 'إجمالي المديرين',
      value: admins.length,
      icon: 'users',
      color: 'blue',
    },
    {
      id: 'active',
      label: 'نشط',
      value: admins.filter((a) => a.status === 'ACTIVE').length,
      icon: 'active',
      color: 'emerald',
    },
    {
      id: 'superAdmins',
      label: 'مدير عام',
      value: admins.filter((a) => a.role === 'super_admin').length,
      icon: 'users',
      color: 'purple',
    },
    {
      id: 'inactive',
      label: 'غير نشط',
      value: admins.filter((a) => a.status === 'INACTIVE').length,
      icon: 'suspended',
      color: 'slate',
    },
  ];

  // تعريف أعمدة الجدول باستخدام النظام الموحد
  const columns: TableColumn<Admin>[] = [
    {
      id: 'admin',
      header: 'المدير',
      accessor: 'name',
      type: 'custom',
      render: (_, row) => (
        <UserAvatar
          user={{ name: row.name, profileImage: row.profileImage }}
          size="sm"
          showName={true}
        />
      ),
    },
    {
      id: 'username',
      header: 'اسم المستخدم',
      accessor: 'username',
      type: 'custom',
      render: (value) => <span className="font-mono text-slate-300">@{String(value)}</span>,
    },
    {
      id: 'role',
      header: 'الدور',
      accessor: 'role',
      type: 'custom',
      render: (value) => (
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-4 w-4 text-blue-400" />
          <span className="text-slate-300">
            {ADMIN_ROLE_LABELS[String(value)] || String(value)}
          </span>
        </div>
      ),
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
      id: 'lastLogin',
      header: 'آخر دخول',
      accessor: 'lastLogin',
      type: 'custom',
      render: (value) => (
        <span className="text-sm text-slate-400">
          {value ? formatDate(String(value), 'relative') : '-'}
        </span>
      ),
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
          actions={ActionPresets.admins({
            viewHref: (r) => `/admin/admins/${r.id}`,
            editHref: (r) => `/admin/admins/${r.id}/edit`,
            onActivate: row.status !== 'ACTIVE' ? () => handleToggleStatus(row) : undefined,
            onSuspend: row.status === 'ACTIVE' ? () => handleToggleStatus(row) : undefined,
            onDelete: (r) => handleDelete(r.id),
          })}
          onActionComplete={fetchAdmins}
        />
      ),
    },
  ];

  return (
    <AdminLayout title="إدارة المديرين">
      <AnimatedSection delay={50}>
        <SimpleToast
          message={toast?.text || null}
          type={toast?.type}
          onClose={() => setToast(null)}
        />
      </AnimatedSection>

      <AnimatedSection delay={100}>
        <UnifiedStats stats={stats} columns={4} className="mb-6" />
      </AnimatedSection>

      <AnimatedSection delay={150}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">قائمة المديرين</h2>
          <Link
            href="/admin/admins/add"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            إضافة مدير
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={200}>
        <UnifiedSearch
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="البحث بالاسم أو اسم المستخدم..."
          filters={[
            {
              id: 'status',
              label: 'الحالة',
              value: filters.status || 'all',
              onChange: (v) => setFilter('status', v),
              options: statusOptions,
            },
            {
              id: 'role',
              label: 'الدور',
              value: filters.role || 'all',
              onChange: (v) => setFilter('role', v),
              options: roleOptions,
            },
          ]}
          onRefresh={fetchAdmins}
          className="mb-6"
        />
      </AnimatedSection>

      <AnimatedSection delay={250}>
        <UnifiedTable
          columns={columns}
          data={filteredData}
          loading={loading}
          emptyMessage="لا يوجد مديرين"
          sortable={true}
        />
      </AnimatedSection>
    </AdminLayout>
  );
}
