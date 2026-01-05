/**
 * صفحة إدارة طلبات/حجوزات خدمات النقل
 * Transport Bookings Management Page
 */

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

// حالات الحجز - الوضع الداكن
const BOOKING_STATUS = {
  PENDING: { label: 'في انتظار القبول', color: 'bg-amber-500/20 text-amber-300', icon: ClockIcon },
  ACCEPTED: { label: 'تم القبول', color: 'bg-green-500/20 text-green-300', icon: CheckCircleIcon },
  IN_PROGRESS: { label: 'جاري التنفيذ', color: 'bg-blue-500/20 text-blue-300', icon: TruckIcon },
  COMPLETED: { label: 'مكتمل', color: 'bg-slate-500/20 text-slate-300', icon: CheckCircleIcon },
  CANCELLED: { label: 'ملغي', color: 'bg-red-500/20 text-red-300', icon: XCircleIcon },
  REJECTED: { label: 'مرفوض', color: 'bg-red-500/20 text-red-300', icon: XCircleIcon },
};

interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fromCity: string;
  toCity: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  preferredDate: string;
  preferredTime?: string;
  status: keyof typeof BOOKING_STATUS;
  estimatedPrice?: number;
  distance?: number;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    title: string;
    truckType: string;
    pricePerKm?: number;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    profileImage?: string;
  };
  provider?: {
    id: string;
    name: string;
    phone: string;
    verified?: boolean;
  };
}

interface Stats {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  rejected: number;
}

export default function TransportBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    accepted: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  });

  // فلاتر
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // حالات الـ UI
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // جلب الحجوزات
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search }),
        ...(dateFrom && { fromDate: dateFrom }),
        ...(dateTo && { toDate: dateTo }),
      });

      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/transport/bookings?${params}`, {
        credentials: 'include', // إرسال cookies مع الطلب
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json();

      if (result.success) {
        setBookings(result.data.bookings || []);
        setStats(result.data.stats || stats);
        setTotalPages(result.data.pagination?.totalPages || 1);
      } else {
        console.error('خطأ في جلب الحجوزات:', result.error);
        setToast({ message: result.error || 'خطأ في جلب البيانات', type: 'error' });
      }
    } catch (error) {
      console.error('خطأ:', error);
      setToast({ message: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // إخفاء Toast تلقائياً
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // تحديث حالة الحجز
  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/transport/bookings', {
        method: 'PUT',
        credentials: 'include', // إرسال cookies مع الطلب
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: bookingId, status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setToast({ message: 'تم تحديث حالة الحجز بنجاح', type: 'success' });
        fetchBookings();
        setShowUpdateModal(false);
      } else {
        setToast({ message: result.error || 'خطأ في تحديث الحجز', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // حذف حجز
  const deleteBooking = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/transport/bookings?id=${bookingId}`, {
        method: 'DELETE',
        credentials: 'include', // إرسال cookies مع الطلب
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json();

      if (result.success) {
        setToast({ message: 'تم حذف الحجز بنجاح', type: 'success' });
        fetchBookings();
        setShowDeleteConfirm(false);
        setSelectedBooking(null);
      } else {
        setToast({ message: result.error || 'خطأ في حذف الحجز', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-LY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AdminLayout title="إدارة طلبات النقل">
      <Head>
        <title>إدارة طلبات النقل | لوحة التحكم</title>
      </Head>

      <div className="space-y-6">
        {/* العنوان والإحصائيات */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة طلبات النقل</h1>
            <p className="mt-1 text-sm text-slate-400">
              إدارة ومتابعة جميع طلبات وحجوزات خدمات النقل
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/transport/booking-settings')}
              className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
            >
              <DocumentTextIcon className="h-4 w-4" />
              إعدادات الرسائل
            </button>
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <StatCard
            label="الإجمالي"
            value={stats.total}
            color="bg-gray-100 text-gray-800"
            onClick={() => setStatusFilter('all')}
            active={statusFilter === 'all'}
          />
          <StatCard
            label="في الانتظار"
            value={stats.pending}
            color="bg-amber-100 text-amber-800"
            onClick={() => setStatusFilter('PENDING')}
            active={statusFilter === 'PENDING'}
          />
          <StatCard
            label="مقبولة"
            value={stats.accepted}
            color="bg-green-100 text-green-800"
            onClick={() => setStatusFilter('ACCEPTED')}
            active={statusFilter === 'ACCEPTED'}
          />
          <StatCard
            label="قيد التنفيذ"
            value={stats.inProgress}
            color="bg-blue-100 text-blue-800"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            active={statusFilter === 'IN_PROGRESS'}
          />
          <StatCard
            label="مكتملة"
            value={stats.completed}
            color="bg-gray-100 text-gray-600"
            onClick={() => setStatusFilter('COMPLETED')}
            active={statusFilter === 'COMPLETED'}
          />
          <StatCard
            label="ملغية"
            value={stats.cancelled}
            color="bg-red-100 text-red-800"
            onClick={() => setStatusFilter('CANCELLED')}
            active={statusFilter === 'CANCELLED'}
          />
          <StatCard
            label="مرفوضة"
            value={stats.rejected}
            color="bg-red-100 text-red-600"
            onClick={() => setStatusFilter('REJECTED')}
            active={statusFilter === 'REJECTED'}
          />
        </div>

        {/* شريط البحث والفلاتر */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-800 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم، الرقم، المدينة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2.5 pl-4 pr-10 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">من:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">إلى:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {(search || dateFrom || dateTo || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                  setStatusFilter('all');
                }}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>

        {/* جدول الحجوزات */}
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-20 text-center">
              <TruckIcon className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-400">لا توجد حجوزات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-700 bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium text-slate-300">رقم الطلب</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-300">العميل</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-300">مسار النقل</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-300">الخدمة</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-300">التاريخ</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-300">الحالة</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-300">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {bookings.map((booking) => {
                    const statusInfo = BOOKING_STATUS[booking.status] || BOOKING_STATUS.PENDING;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={booking.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-400">
                            #{booking.id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                              <UserIcon className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{booking.customerName}</p>
                              <p className="text-xs text-slate-400">{booking.customerPhone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-300">
                              {booking.fromCity}
                            </span>
                            <span className="text-slate-500">←</span>
                            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                              {booking.toCity}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white">{booking.service?.title || '-'}</p>
                          <p className="text-xs text-slate-400">
                            {booking.service?.truckType || ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white">{formatDate(booking.preferredDate)}</p>
                          <p className="text-xs text-slate-400">{booking.preferredTime || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowDetailsModal(true);
                              }}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-blue-400"
                              title="عرض التفاصيل"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowUpdateModal(true);
                              }}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-green-400"
                              title="تحديث الحالة"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowDeleteConfirm(true);
                              }}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                              title="حذف"
                            >
                              <TrashIcon className="h-4 w-4" />
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900 px-4 py-3">
              <p className="text-sm text-slate-400">
                صفحة {page} من {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal عرض التفاصيل */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">تفاصيل الطلب</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg p-2 hover:bg-slate-700"
              >
                <XCircleIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <DetailRow
                label="رقم الطلب"
                value={`#${selectedBooking.id.slice(-8).toUpperCase()}`}
              />
              <DetailRow label="اسم العميل" value={selectedBooking.customerName} />
              <DetailRow label="رقم الهاتف" value={selectedBooking.customerPhone} isPhone />
              <DetailRow label="من" value={selectedBooking.fromCity} />
              <DetailRow label="إلى" value={selectedBooking.toCity} />
              <DetailRow label="التاريخ" value={formatDate(selectedBooking.preferredDate)} />
              <DetailRow label="الوقت" value={selectedBooking.preferredTime || 'غير محدد'} />
              <DetailRow label="الخدمة" value={selectedBooking.service?.title || '-'} />
              <DetailRow
                label="السعر المقدر"
                value={
                  selectedBooking.estimatedPrice
                    ? `${selectedBooking.estimatedPrice} د.ل`
                    : 'غير محدد'
                }
              />
              <DetailRow
                label="المسافة"
                value={selectedBooking.distance ? `${selectedBooking.distance} كم` : 'غير محدد'}
              />
              <DetailRow label="ملاحظات" value={selectedBooking.specialInstructions || 'لا توجد'} />
              <DetailRow label="تاريخ الإنشاء" value={formatDate(selectedBooking.createdAt)} />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تحديث الحالة */}
      {showUpdateModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-white">تحديث حالة الطلب</h2>
            <p className="mb-4 text-sm text-slate-400">
              طلب رقم: #{selectedBooking.id.slice(-8).toUpperCase()}
            </p>

            <div className="space-y-2">
              {Object.entries(BOOKING_STATUS).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => updateBookingStatus(selectedBooking.id, key)}
                  disabled={actionLoading || selectedBooking.status === key}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-right transition-colors ${
                    selectedBooking.status === key
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-slate-600 hover:bg-slate-700'
                  } disabled:opacity-50`}
                >
                  <info.icon className="h-5 w-5 text-slate-300" />
                  <span className="font-medium text-white">{info.label}</span>
                  {selectedBooking.status === key && (
                    <span className="mr-auto text-xs text-blue-400">الحالة الحالية</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm && !!selectedBooking}
        title="تأكيد الحذف"
        message={
          selectedBooking && (
            <p>
              هل أنت متأكد من حذف الطلب رقم{' '}
              <strong className="text-white">
                #{selectedBooking.id.slice(-8).toUpperCase()}
              </strong>
              ؟
              <br />
              <span className="text-sm text-red-400">هذا الإجراء لا يمكن التراجع عنه.</span>
            </p>
          )
        }
        variant="danger"
        confirmLabel="حذف نهائي"
        cancelLabel="إلغاء"
        loading={actionLoading}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => selectedBooking && deleteBooking(selectedBooking.id)}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 z-50 rounded-lg px-4 py-3 shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}
        >
          {toast.message}
        </div>
      )}
    </AdminLayout>
  );
}

// مكون بطاقة الإحصائيات - الوضع الداكن
function StatCard({
  label,
  value,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  color: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-center transition-all ${
        active
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : 'border-slate-700 hover:border-slate-600'
      } bg-slate-800`}
    >
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </button>
  );
}

// مكون صف التفاصيل - الوضع الداكن
function DetailRow({
  label,
  value,
  isPhone = false,
}: {
  label: string;
  value: string;
  isPhone?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-700 py-2">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-white">{value}</span>
        {isPhone && value && (
          <a
            href={`tel:${value}`}
            className="rounded-full bg-green-500/20 p-1.5 text-green-400 hover:bg-green-500/30"
          >
            <PhoneIcon className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
