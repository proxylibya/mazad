/**
 * صفحة إدارة طلبات الإعلانات والأعمال
 * Enterprise-grade Advertising Requests Management
 */

import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  SparklesIcon,
  TrashIcon,
  UserCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../../components/AdminLayout';

// أنواع البيانات
interface AdvertisingRequest {
  id: string;
  requestType: 'ADVERTISING_SERVICE' | 'TEAM_CONTACT';
  name: string;
  phone: string;
  dialCode: string;
  city: string;
  companyName?: string;
  serviceType: string;
  packageType?: string;
  message?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  assignedAdminName?: string;
  adminNotes?: string;
  contactedAt?: string;
  contactMethod?: string;
  contactNotes?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  new: number;
  inReview: number;
  contacted: number;
  inProgress: number;
  completed: number;
  rejected: number;
}

// ثوابت الحالات
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: 'جديد', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  IN_REVIEW: { label: 'قيد المراجعة', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  CONTACTED: { label: 'تم التواصل', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  IN_PROGRESS: { label: 'قيد التنفيذ', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  COMPLETED: { label: 'مكتمل', color: 'text-green-400', bg: 'bg-green-500/20' },
  REJECTED: { label: 'مرفوض', color: 'text-red-400', bg: 'bg-red-500/20' },
  CANCELLED: { label: 'ملغي', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'منخفض', color: 'text-slate-400' },
  NORMAL: { label: 'عادي', color: 'text-blue-400' },
  HIGH: { label: 'عالي', color: 'text-orange-400' },
  URGENT: { label: 'عاجل', color: 'text-red-400' },
};

const REQUEST_TYPE_CONFIG: Record<string, { label: string; icon: typeof SparklesIcon }> = {
  ADVERTISING_SERVICE: { label: 'طلب إعلاني', icon: SparklesIcon },
  TEAM_CONTACT: { label: 'مراسلة الفريق', icon: ChatBubbleLeftRightIcon },
};

export default function AdvertisingRequestsPage() {
  const [requests, setRequests] = useState<AdvertisingRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AdvertisingRequest | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // فلاتر
  const [filters, setFilters] = useState({
    status: 'all',
    requestType: 'all',
    priority: 'all',
    search: '',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchRequests();
  }, [filters, pagination.page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.requestType !== 'all' && { requestType: filters.requestType }),
        ...(filters.priority !== 'all' && { priority: filters.priority }),
        ...(filters.search && { search: filters.search }),
      });

      const res = await fetch(`/api/admin/promotions/requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data.requests || []);
        setStats(data.data.stats || null);
        setPagination((prev) => ({
          ...prev,
          total: data.data.pagination.total,
          pages: data.data.pagination.pages,
        }));
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/promotions/requests?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchRequests();
        if (selectedRequest?.id === id) {
          setSelectedRequest((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;

    try {
      const res = await fetch(`/api/admin/promotions/requests?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchRequests();
        if (selectedRequest?.id === id) {
          setSelectedRequest(null);
        }
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhone = (phone: string, dialCode: string) => {
    return `${dialCode}${phone}`;
  };

  return (
    <AdminLayout title="طلبات الإعلانات">
      <Head>
        <title>طلبات الإعلانات - لوحة التحكم</title>
      </Head>

      {/* إحصائيات سريعة */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="الإجمالي" value={stats.total} color="text-white" bg="bg-slate-700" />
          <StatCard label="جديد" value={stats.new} color="text-blue-400" bg="bg-blue-500/20" />
          <StatCard
            label="قيد المراجعة"
            value={stats.inReview}
            color="text-yellow-400"
            bg="bg-yellow-500/20"
          />
          <StatCard
            label="تم التواصل"
            value={stats.contacted}
            color="text-purple-400"
            bg="bg-purple-500/20"
          />
          <StatCard
            label="قيد التنفيذ"
            value={stats.inProgress}
            color="text-cyan-400"
            bg="bg-cyan-500/20"
          />
          <StatCard
            label="مكتمل"
            value={stats.completed}
            color="text-green-400"
            bg="bg-green-500/20"
          />
          <StatCard label="مرفوض" value={stats.rejected} color="text-red-400" bg="bg-red-500/20" />
        </div>
      )}

      {/* شريط الأدوات */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* البحث */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الهاتف..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-64 rounded-lg border border-slate-600 bg-slate-700 py-2 pl-4 pr-10 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* زر الفلاتر */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
              showFilters
                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                : 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            الفلاتر
          </button>
        </div>

        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600"
        >
          <ArrowPathIcon className="h-5 w-5" />
          تحديث
        </button>
      </div>

      {/* الفلاتر */}
      {showFilters && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-700 bg-slate-800 p-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-slate-400">الحالة</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
            >
              <option value="all">الكل</option>
              {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">نوع الطلب</label>
            <select
              value={filters.requestType}
              onChange={(e) => setFilters((prev) => ({ ...prev, requestType: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
            >
              <option value="all">الكل</option>
              <option value="ADVERTISING_SERVICE">طلب إعلاني</option>
              <option value="TEAM_CONTACT">مراسلة الفريق</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">الأولوية</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
            >
              <option value="all">الكل</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* جدول الطلبات */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <SparklesIcon className="mb-4 h-12 w-12" />
            <p>لا توجد طلبات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-700 bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">الطلب</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                    مقدم الطلب
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                    نوع الخدمة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                    الأولوية
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                    التاريخ
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {requests.map((request) => {
                  const typeConfig = REQUEST_TYPE_CONFIG[request.requestType];
                  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.NEW;
                  const priorityConfig =
                    PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.NORMAL;
                  const TypeIcon = typeConfig?.icon || SparklesIcon;

                  return (
                    <tr key={request.id} className="transition-colors hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-lg p-2 ${request.requestType === 'TEAM_CONTACT' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}
                          >
                            <TypeIcon
                              className={`h-5 w-5 ${request.requestType === 'TEAM_CONTACT' ? 'text-purple-400' : 'text-blue-400'}`}
                            />
                          </div>
                      <div>
                            <p
                              className="text-sm font-medium text-white truncate"
                              title={typeConfig?.label}
                            >
                              {typeConfig?.label}
                            </p>
                            <p className="text-xs text-slate-400">{request.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserCircleIcon className="h-8 w-8 text-slate-500" />
                          <div>
                            <p className="text-sm font-medium text-white">{request.name}</p>
                            <p className="text-xs text-slate-400">{request.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300">{request.serviceType}</p>
                        {request.companyName && (
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <BuildingOffice2Icon className="h-3 w-3" />
                            {request.companyName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <ClockIcon className="h-4 w-4" />
                          {formatDate(request.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
                            title="عرض التفاصيل"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              window.open(`tel:${formatPhone(request.phone, request.dialCode)}`)
                            }
                            className="rounded-lg p-1.5 text-green-400 transition-colors hover:bg-green-500/20"
                            title="اتصال"
                          >
                            <PhoneIcon className="h-5 w-5" />
                          </button>
                          {request.status === 'NEW' && (
                            <button
                              onClick={() => handleStatusChange(request.id, 'IN_REVIEW')}
                              className="rounded-lg p-1.5 text-yellow-400 transition-colors hover:bg-yellow-500/20"
                              title="بدء المراجعة"
                            >
                              <ClockIcon className="h-5 w-5" />
                            </button>
                          )}
                          {request.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleStatusChange(request.id, 'COMPLETED')}
                              className="rounded-lg p-1.5 text-green-400 transition-colors hover:bg-green-500/20"
                              title="إكمال"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
                            title="حذف"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700 px-4 py-3">
            <p className="text-sm text-slate-400">
              عرض {(pagination.page - 1) * pagination.limit + 1} -{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="rounded-lg border border-slate-600 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="rounded-lg border border-slate-600 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal تفاصيل الطلب */}
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={handleStatusChange}
          formatDate={formatDate}
          formatPhone={formatPhone}
        />
      )}
    </AdminLayout>
  );
}

// مكون بطاقة الإحصائيات
function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-700 ${bg} p-4`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// Modal تفاصيل الطلب
function RequestDetailsModal({
  request,
  onClose,
  onStatusChange,
  formatDate,
  formatPhone,
}: {
  request: AdvertisingRequest;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  formatDate: (date: string) => string;
  formatPhone: (phone: string, dialCode: string) => string;
}) {
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.NEW;
  const priorityConfig = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.NORMAL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">تفاصيل الطلب</h2>
            <p className="text-sm text-slate-400">{request.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* الحالة والأولوية */}
          <div className="flex flex-wrap gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border border-slate-600 px-3 py-1.5 text-sm font-medium ${priorityConfig.color}`}
            >
              أولوية: {priorityConfig.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 px-3 py-1.5 text-sm text-slate-300">
              {request.requestType === 'TEAM_CONTACT' ? 'مراسلة الفريق' : 'طلب إعلاني'}
            </span>
          </div>

          {/* معلومات مقدم الطلب */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <h3 className="mb-4 text-lg font-semibold text-white">معلومات مقدم الطلب</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">الاسم</p>
                <p className="text-white">{request.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">الهاتف</p>
                <a
                  href={`tel:${formatPhone(request.phone, request.dialCode)}`}
                  className="text-blue-400 hover:underline"
                >
                  {formatPhone(request.phone, request.dialCode)}
                </a>
              </div>
              <div>
                <p className="text-sm text-slate-400">المدينة</p>
                <p className="text-white">{request.city}</p>
              </div>
              {request.companyName && (
                <div>
                  <p className="text-sm text-slate-400">الشركة</p>
                  <p className="text-white">{request.companyName}</p>
                </div>
              )}
            </div>
          </div>

          {/* تفاصيل الطلب */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <h3 className="mb-4 text-lg font-semibold text-white">تفاصيل الطلب</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-400">نوع الخدمة</p>
                <p className="text-white">{request.serviceType}</p>
              </div>
              {request.message && (
                <div>
                  <p className="text-sm text-slate-400">الرسالة</p>
                  <p className="whitespace-pre-wrap text-white">{request.message}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-400">تاريخ الإرسال</p>
                <p className="text-white">{formatDate(request.createdAt)}</p>
              </div>
              {request.source && (
                <div>
                  <p className="text-sm text-slate-400">المصدر</p>
                  <p className="text-white">{request.source}</p>
                </div>
              )}
            </div>
          </div>

          {/* إجراءات سريعة */}
          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${formatPhone(request.phone, request.dialCode)}`}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
            >
              <PhoneIcon className="h-5 w-5" />
              اتصال
            </a>
            <a
              href={`https://wa.me/${request.dialCode.replace('+', '')}${request.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              واتساب
            </a>
            {request.status !== 'COMPLETED' && (
              <button
                onClick={() => onStatusChange(request.id, 'COMPLETED')}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <CheckCircleIcon className="h-5 w-5" />
                إكمال الطلب
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
