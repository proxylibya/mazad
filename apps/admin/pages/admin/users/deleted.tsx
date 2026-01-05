/**
 * صفحة المستخدمين المحذوفين
 * Deleted Users Page
 */

import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

interface DeletedUser {
  id: string;
  name: string;
  phone: string;
  status: string;
  role: string;
  createdAt: string;
  deletedAt?: string;
  isDeleted: boolean;
}

export default function DeletedUsers() {
  const [users, setUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const fetchDeletedUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?deleted=true');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch deleted users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeleted: false, status: 'ACTIVE' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'تم استعادة المستخدم بنجاح' });
        fetchDeletedUsers();
      } else {
        setMessage({ type: 'error', text: data.message || 'فشل استعادة المستخدم' });
      }
    } catch (err) {
      console.error('Failed to restore user:', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الاستعادة' });
    } finally {
      setRestoreConfirm(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}?permanent=true`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'تم الحذف النهائي بنجاح' });
        fetchDeletedUsers();
      } else {
        setMessage({ type: 'error', text: data.message || 'فشل الحذف النهائي' });
      }
    } catch (err) {
      console.error('Failed to permanently delete user:', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحذف' });
    } finally {
      setPermanentDeleteConfirm(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery),
  );

  const roleLabels: Record<string, string> = {
    USER: 'مستخدم',
    ADMIN: 'مدير',
    MODERATOR: 'مشرف',
    SUPER_ADMIN: 'مدير عام',
    SELLER: 'بائع',
    BUYER: 'مشتري',
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout title="المستخدمين المحذوفين">
      {/* Message */}
      {message && (
        <div
          className={`mb-4 rounded-lg p-4 ${
            message.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
              : 'border border-red-500/30 bg-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 rounded-xl border border-slate-600 bg-slate-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-slate-300">{users.length}</p>
            <p className="text-slate-400">مستخدم محذوف</p>
          </div>
          <TrashIcon className="h-14 w-14 text-slate-600" />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          هؤلاء المستخدمين تم حذفهم مؤقتاً ويمكن استعادتهم أو حذفهم نهائياً
        </p>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/users" className="text-sm text-slate-400 hover:text-white">
          &rarr; العودة لجميع المستخدمين
        </Link>
        <button
          onClick={fetchDeletedUsers}
          className="rounded-lg bg-slate-700 p-2 text-slate-300 transition-colors hover:bg-slate-600"
          title="تحديث"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="البحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2.5 pl-4 pr-10 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-slate-400">جاري التحميل...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <UserCircleIcon className="mx-auto h-16 w-16 text-slate-600" />
            <p className="mt-4 text-slate-400">لا يوجد مستخدمين محذوفين</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-700 bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                    المستخدم
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                    رقم الهاتف
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                    الدور
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                    تاريخ الحذف
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium uppercase text-slate-400">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-700/30">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-600 opacity-50">
                          <span className="text-sm font-semibold text-white">
                            {user.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p
                            className="truncate font-medium text-slate-400 line-through"
                            title={user.name || 'بدون اسم'}
                          >
                            {user.name || 'بدون اسم'}
                          </p>
                          <p className="text-xs text-slate-500">محذوف</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400" dir="ltr">
                        <PhoneIcon className="h-4 w-4 text-slate-600" />
                        {user.phone || '-'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                      {roleLabels[user.role] || user.role}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                      {formatDate(user.deletedAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setRestoreConfirm(user.id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-emerald-700"
                          title="استعادة"
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" />
                          استعادة
                        </button>
                        <button
                          onClick={() => setPermanentDeleteConfirm(user.id)}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700"
                          title="حذف نهائي"
                        >
                          <TrashIcon className="h-4 w-4" />
                          حذف نهائي
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!restoreConfirm}
        title="تأكيد الاستعادة"
        message="هل أنت متأكد من استعادة هذا المستخدم؟ سيتم إعادة تفعيل حسابه."
        variant="primary"
        confirmLabel="استعادة"
        cancelLabel="إلغاء"
        onCancel={() => setRestoreConfirm(null)}
        onConfirm={() => restoreConfirm && handleRestore(restoreConfirm)}
      />

      <ConfirmDialog
        open={!!permanentDeleteConfirm}
        title="تحذير: حذف نهائي"
        message={
          <div className="space-y-3">
            <p>هل أنت متأكد من الحذف النهائي لهذا المستخدم؟</p>
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع بيانات المستخدم بشكل دائم.
            </p>
          </div>
        }
        variant="danger"
        confirmLabel="حذف نهائي"
        cancelLabel="إلغاء"
        onCancel={() => setPermanentDeleteConfirm(null)}
        onConfirm={() =>
          permanentDeleteConfirm && handlePermanentDelete(permanentDeleteConfirm)
        }
      />
    </AdminLayout>
  );
}
