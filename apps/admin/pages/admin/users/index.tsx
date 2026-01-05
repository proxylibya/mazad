/**
 * صفحة إدارة المستخدمين - محدّثة بالنظام الموحد
 * Users Management Page - Updated with Unified System
 */

import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import UnifiedActionsColumn, {
  ActionPresets,
} from '../../../components/tables/UnifiedActionsColumn';
import {
  CommonFilters,
  ROLE_LABELS,
  SimpleToast,
  StatsPresets,
  UnifiedSearch,
  UnifiedStats,
  UnifiedTable,
  UserAvatar,
  formatPhoneNumber,
  getStatusClasses,
  getStatusConfig,
  useSearchFilter,
  type TableColumn,
} from '../../../components/unified';

interface User {
  id: string;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';
  role: string;
  createdAt: string;
  verified?: boolean;
  profileImage?: string;
  lastLogin?: string;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // استخدام hook البحث والفلترة الموحد
  const { searchValue, setSearchValue, filters, setFilter, filteredData } = useSearchFilter({
    data: users,
    searchFields: ['name', 'phone'],
    initialFilters: { status: 'all' },
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setMessage({ type: 'error', text: 'فشل تحميل المستخدمين' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'تم حذف المستخدم بنجاح' });
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.message || 'فشل حذف المستخدم' });
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحذف' });
    } finally {
      setDeleteConfirm(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBlockUser = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: newStatus === 'BLOCKED' ? 'تم حظر المستخدم' : 'تم إلغاء حظر المستخدم',
        });
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  // حساب الإحصائيات
  const stats = StatsPresets.users({
    total: users.length,
    active: users.filter((u) => u.status === 'ACTIVE').length,
    blocked: users.filter((u) => u.status === 'BLOCKED').length,
    suspended: users.filter((u) => u.status === 'SUSPENDED').length,
  });

  // تعريف أعمدة الجدول باستخدام النظام الموحد
  const columns: TableColumn<User>[] = [
    {
      id: 'user',
      header: 'المستخدم',
      accessor: 'name',
      type: 'custom',
      render: (_, row) => (
        <UserAvatar
          user={{ name: row.name, profileImage: row.profileImage }}
          size="sm"
          showName={true}
          showVerified={true}
          verified={row.verified}
        />
      ),
    },
    {
      id: 'phone',
      header: 'رقم الهاتف',
      accessor: 'phone',
      type: 'custom',
      render: (value) => (
        <span className="text-slate-300" dir="ltr">
          {formatPhoneNumber(String(value || ''))}
        </span>
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
      id: 'role',
      header: 'الدور',
      accessor: 'role',
      type: 'custom',
      render: (value) => (
        <span className="text-slate-300">{ROLE_LABELS[String(value)] || String(value)}</span>
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
          actions={ActionPresets.users({
            viewHref: (r) => `/admin/users/${r.id}`,
            editHref: (r) => `/admin/users/${r.id}/edit`,
            onBan: (r) => handleBlockUser(r.id, r.status),
            onDelete: (r) => setDeleteConfirm(r.id),
          })}
          onActionComplete={fetchUsers}
        />
      ),
    },
  ];

  return (
    <AdminLayout title="إدارة المستخدمين">
      {/* Toast Message */}
      <SimpleToast
        message={message?.text || null}
        type={message?.type}
        onClose={() => setMessage(null)}
      />

      {/* Stats - النظام الموحد */}
      <UnifiedStats stats={stats} columns={4} className="mb-6" />

      {/* Header with Add Button */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">قائمة المستخدمين</h2>
        <Link
          href="/admin/users/add"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          إضافة مستخدم
        </Link>
      </div>

      {/* Search & Filter - النظام الموحد */}
      <UnifiedSearch
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث بالاسم أو رقم الهاتف..."
        filters={[
          {
            id: 'status',
            label: 'الحالة',
            value: filters.status || 'all',
            onChange: (v) => setFilter('status', v),
            options: CommonFilters.userStatus,
          },
        ]}
        onRefresh={fetchUsers}
        className="mb-6"
      />

      {/* Table - النظام الموحد */}
      <UnifiedTable
        columns={columns}
        data={filteredData}
        loading={loading}
        emptyMessage="لا يوجد مستخدمين"
        sortable={true}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء."
        variant="danger"
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </AdminLayout>
  );
}
