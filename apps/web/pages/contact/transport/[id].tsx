import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import LoginModal from '../../../components/auth/LoginModal';
import { OpensooqNavbar } from '../../../components/common';
import { handlePhoneClickUnified } from '../../../utils/phoneActions';

import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import TruckIcon from '@heroicons/react/24/outline/TruckIcon';

import useAuthProtection from '../../../hooks/useAuthProtection';
import { prisma } from '../../../lib/prisma';

const SITE_TEAM_USER_ID = 'site_team';

interface ProviderInfo {
  id: string;
  name: string;
  phone: string | null;
  verified: boolean;
  profileImage: string | null;
  accountType: string | null;
}

interface TransportServiceSSR {
  id: string;
  title: string;
  description: string | null;
  truckType: string | null;
  capacity: number | null;
  serviceArea: string[];
  pricePerKm: number | null;
  images: string[];
  features: string[];
  status: string;
  createdAt: string;
  provider: ProviderInfo;
  contactPhone: string | null;
}

interface PageProps {
  service: TransportServiceSSR | null;
}

const TransportContactPage = ({ service }: PageProps) => {
  const router = useRouter();
  const { action } = router.query as { action?: string };

  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | '';
    message: string;
  }>({ show: false, type: '', message: '' });

  const { isAuthenticated, showAuthModal, setShowAuthModal, requireLogin, handleAuthClose } =
    useAuthProtection({ showModal: true });

  useEffect(() => {
    if (!isAuthenticated) setShowAuthModal(true);
  }, [isAuthenticated, setShowAuthModal]);

  const phone = useMemo(() => service?.contactPhone || service?.provider?.phone || '', [service]);

  // Move useEffect before early return to comply with hooks rules
  useEffect(() => {
    if (action === 'book' && service) {
      // إبراز زر الحجز عند فتح الصفحة لغرض الحجز
      setNotification({
        show: true,
        type: 'warning',
        message: 'لطلب الحجز: يمكنك الضغط على "احجز الآن" أو الاتصال مباشرة',
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4500);
    }
  }, [action, service]);

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">الخدمة غير موجودة</h1>
          <p className="mb-6 text-gray-600">تعذر العثور على خدمة النقل المطلوبة</p>
          <Link
            href="/transport"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            العودة لخدمات النقل
          </Link>
        </div>
      </div>
    );
  }

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4500);
  };

  const handleCall = () => {
    requireLogin('للاتصال بمقدم الخدمة', () => {
      if (phone) {
        handlePhoneClickUnified({ phone });
        showToast('success', 'تم فتح تطبيق الهاتف للاتصال');
      } else {
        showToast('error', 'رقم الهاتف غير متوفر');
      }
    });
  };

  const handleMessage = () => {
    requireLogin('للمراسلة', () => {
      router.push(
        `/messages?chat=${service.provider.id}&name=${encodeURIComponent(service.provider.name)}&phone=${encodeURIComponent(phone)}&type=transport`,
      );
    });
  };

  const handleBook = () => {
    requireLogin('لحجز الخدمة', () => {
      // نستخدم المراسلة كقناة الحجز المفضلة مع تمرير غرض الحجز
      router.push(
        `/messages?chat=${service.provider.id}&name=${encodeURIComponent(service.provider.name)}&phone=${encodeURIComponent(phone)}&type=transport&purpose=book`,
      );
    });
  };

  const coverImage = service.images?.[0] || '/images/cars/default-car.svg';

  return (
    <>
      <Head>
        <title>الاتصال بمقدم خدمة النقل - {service.title}</title>
        <meta
          name="description"
          content={`تواصل مع ${service.provider.name} بخصوص ${service.title}`}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50" dir="rtl">
        <OpensooqNavbar />

        {notification.show && (
          <div
            className={`fixed right-4 top-20 z-50 max-w-sm transform rounded-xl border-2 p-4 shadow-2xl backdrop-blur-sm transition-all duration-300 ${
              notification.type === 'success'
                ? 'border-green-400 bg-green-50/90 text-green-800'
                : notification.type === 'error'
                  ? 'border-red-400 bg-red-50/90 text-red-800'
                  : 'border-yellow-400 bg-yellow-50/90 text-yellow-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' && (
                <ShieldCheckIcon className="h-5 w-5 flex-shrink-0 text-green-600" />
              )}
              {notification.type === 'error' && (
                <ShieldCheckIcon className="h-5 w-5 flex-shrink-0 text-red-600" />
              )}
              {notification.type === 'warning' && (
                <ShieldCheckIcon className="h-5 w-5 flex-shrink-0 text-yellow-600" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* رأس الصفحة */}
          <div className="mb-8">
            <Link
              href="/transport"
              className="group mb-6 inline-flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-800"
            >
              <TruckIcon className="h-4 w-4" />
              العودة لخدمات النقل
            </Link>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="mb-1 text-2xl font-bold text-gray-900">معلومات الاتصال</h1>
                  <p className="text-gray-600">التواصل مع مقدم الخدمة بخصوص: {service.title}</p>
                </div>
                {service.provider.verified && (
                  <div className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                    <ShieldCheckIcon className="h-4 w-4" /> موثق
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* بطاقة الخدمة */}
            <div className="lg:col-span-1">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl">
                <div className="relative">
                  <img src={coverImage} alt={service.title} className="h-56 w-full object-cover" />
                  <div className="absolute right-4 top-4">
                    <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white">
                      {service.status === 'ACTIVE' ? 'متاح' : 'غير متاح'}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{service.title}</h3>
                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <TruckIcon className="h-4 w-4 text-blue-600" />{' '}
                      {service.truckType || 'خدمة نقل'}
                    </div>
                    {service.capacity ? (
                      <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="h-4 w-4 text-green-600" /> السعة:{' '}
                        {service.capacity}
                      </div>
                    ) : null}
                    {service.serviceArea?.length ? (
                      <div className="col-span-2 flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-red-500" />
                        <span className="line-clamp-1">
                          مناطق الخدمة: {service.serviceArea.join('، ')}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* معلومات الاتصال والإجراءات */}
            <div className="space-y-8 lg:col-span-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* احجز الآن */}
                  <button
                    onClick={handleBook}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 font-semibold text-white shadow-sm transition hover:from-green-700 hover:to-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                    title="احجز الآن"
                    type="button"
                  >
                    <CalendarIcon className="h-5 w-5" /> احجز الآن
                  </button>

                  {/* اتصل الآن */}
                  <button
                    onClick={handleCall}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    title="اتصل الآن"
                    type="button"
                  >
                    <PhoneIcon className="h-5 w-5" /> اتصل الآن
                  </button>

                  {/* مراسلة */}
                  <button
                    onClick={handleMessage}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-4 font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    title="مراسلة"
                    type="button"
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" /> مراسلة
                  </button>
                </div>

                {/* رقم الهاتف المعروض */}
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">رقم الهاتف</h4>
                  <div
                    className="rounded-lg border bg-white p-3 font-mono text-lg font-bold text-gray-900"
                    dir="ltr"
                  >
                    {phone || 'غير متوفر'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة تسجيل الدخول */}
      <LoginModal isOpen={showAuthModal} onClose={handleAuthClose} />
    </>
  );
};

export default TransportContactPage;

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ params }) => {
  try {
    const id = params?.id as string;
    if (!id) return { notFound: true };

    const svc = await prisma.transport_services.findFirst({
      where: { id, status: 'ACTIVE' },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            verified: true,
            profileImage: true,
            accountType: true,
          },
        },
      },
    });

    if (!svc) return { notFound: true };

    let teamName: string | null = null;
    let teamPhone: string | null = null;
    if (svc.users?.id === SITE_TEAM_USER_ID) {
      try {
        const record = await prisma.system_settings.findFirst({ where: { key: 'site_team' } });
        const raw = record?.value
          ? typeof record.value === 'string'
            ? (JSON.parse(record.value as string) as any)
            : (record.value as any)
          : null;

        const phones = Array.isArray(raw?.phones)
          ? raw.phones.map((p: any) => String(p || '').trim()).filter(Boolean)
          : [];
        const whatsappPhone = String(raw?.whatsappPhone || '').trim();

        teamName = String(raw?.teamName || svc.users.name || 'فريق مزاد');
        teamPhone = phones.find(Boolean) || whatsappPhone || svc.users.phone || null;
      } catch {
        // ignore parsing errors
      }
    }

    const service: TransportServiceSSR = {
      id: svc.id,
      title: svc.title,
      description: svc.description,
      truckType: svc.truckType,
      capacity: svc.capacity || null,
      serviceArea: svc.serviceArea
        ? svc.serviceArea
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      pricePerKm: typeof svc.pricePerKm === 'number' ? svc.pricePerKm : null,
      images: svc.images
        ? svc.images
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      features: svc.features
        ? svc.features
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      status: svc.status,
      createdAt: svc.createdAt.toISOString(),
      provider: {
        id: svc.users.id,
        name: teamName || svc.users.name,
        phone: teamPhone || svc.users.phone,
        verified: svc.users.verified,
        profileImage: svc.users.profileImage,
        accountType: svc.users.accountType || null,
      },
      contactPhone: teamPhone || svc.contactPhone || svc.users.phone || null,
    };

    return { props: { service } };
  } catch (error) {
    console.error('Error loading transport contact data:', error);
    return { notFound: true };
  }
};
