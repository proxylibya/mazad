/**
 * صفحة المستخدمين المحظورين
 * Banned Users Page
 */

import {
  ArrowPathIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';

interface User {
  id: string;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';
  role: string;
  createdAt: string;
  verified?: boolean;
}

export default function BannedUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  const fetchBannedUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?status=BLOCKED');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch banned users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'تم إلغاء حظر المستخدم بنجاح' });
        fetchBannedUsers();
      } else {
        setMessage({ type: 'error', text: data.message || 'فشل إلغاء الحظر' });
      }
    } catch (err) {
      console.error('Failed to unblock user:', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء إلغاء الحظر' });
    }
    setTimeout(() => setMessage(null), 3000);
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

  return (
    <AdminLayout title="المستخدمين المحظورين">
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
      <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-red-400">{users.length}</p>
            <p className="text-red-400/70">مستخدم محظور</p>
          </div>
          <NoSymbolIcon className="h-14 w-14 text-red-500/50" />
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/users" className="text-sm text-slate-400 hover:text-white">
          &rarr; العودة لجميع المستخدمين
        </Link>
        <button
          onClick={fetchBannedUsers}
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
            <CheckCircleIcon className="mx-auto h-16 w-16 text-emerald-500/50" />
            <p className="mt-4 text-slate-400">لا يوجد مستخدمين محظورين</p>
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
                  <th className="px-6 py-4 text-center text-xs font-medium uppercase text-slate-400">
                    إلغاء الحظر
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-700/30">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600">
                          <span className="text-sm font-semibold text-white">
                            {user.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p
                            className="truncate font-medium text-white"
                            title={user.name || 'بدون اسم'}
                          >
                            {user.name || 'بدون اسم'}
                          </p>
                          <p className="text-xs text-red-400">محظور</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300" dir="ltr">
                        <PhoneIcon className="h-4 w-4 text-slate-500" />
                        {user.phone || '-'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                      {roleLabels[user.role] || user.role}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleUnblock(user.id)}
                          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-700"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          إلغاء الحظر
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
    </AdminLayout>
  );
}
