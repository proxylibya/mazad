import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import CalendarDaysIcon from '@heroicons/react/24/outline/CalendarDaysIcon';
import ChartBarIcon from '@heroicons/react/24/outline/ChartBarIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CurrencyDollarIcon from '@heroicons/react/24/outline/CurrencyDollarIcon';
import DocumentTextIcon from '@heroicons/react/24/outline/DocumentTextIcon';
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import PrinterIcon from '@heroicons/react/24/outline/PrinterIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import Head from 'next/head';
import { useState } from 'react';
import { OpensooqNavbar } from '../components/common';

const TrackApplicationPage = () => {
  const [applicationId, setApplicationId] = useState('');
  const [applicationData, setApplicationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!applicationId.trim()) {
      setError('يرجى إدخال رقم الطلب');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // محاكاة البحث - في التطبيق الحقيقي سيكون API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // بيانات تجريبية محسنة
      const mockData = {
        id: applicationId,
        applicantName: 'محمد أحمد الزروق',
        centerName: 'مركز طرابلس المتقدم للفحص الفني',
        country: 'ليبيا',
        city: 'طرابلس',
        region: 'منطقة الدهماني',
        status: 'under_review',
        submittedDate: '2024-01-10',
        lastUpdate: '2024-01-15',
        estimatedDecision: '2024-01-25',
        priority: 'عالية',
        investmentPlan: 'الخطة المتقدمة',
        investmentAmount: '280,000 دولار',
        expectedROI: '28%',
        reviewNotes:
          'الطلب قيد المراجعة التفصيلية من قبل فريق التقييم. تم تقييم الموقع المقترح بنجاح، وجاري مراجعة الوثائق المالية. سيتم التواصل معكم خلال الأسبوع القادم لتحديد موعد المقابلة.',
        reviewScore: 85,
        documentsStatus: {
          personalDocuments: 'مكتملة',
          financialDocuments: 'قيد المراجعة',
          locationDocuments: 'مكتملة',
          businessPlan: 'مكتملة',
        },
        nextSteps: [
          {
            step: 'إكمال مراجعة الوثائق المالية',
            description: 'سيتم الانتهاء من مراجعة البيانات المالية خلال 2-3 أيام',
            deadline: '2024-01-17',
            responsible: 'فريق التقييم المالي',
          },
          {
            step: 'المراجعة التقنية للمشروع',
            description: 'تقييم الجوانب التقنية ومتطلبات المعدات',
            deadline: '2024-01-19',
            responsible: 'فريق التقييم التقني',
          },
          {
            step: 'تحديد موعد المقابلة الشخصية',
            description: 'سيتم التواصل معكم لتحديد موعد مناسب للمقابلة',
            deadline: '2024-01-20',
            responsible: 'فريق التوسع والاستثمار',
          },
          {
            step: 'اتخاذ القرار النهائي',
            description: 'مراجعة نهائية من لجنة الاستثمار واتخاذ القرار',
            deadline: '2024-01-25',
            responsible: 'لجنة الاستثمار',
          },
        ],
        requirements: [
          {
            title: 'الوثائق المطلوبة',
            items: ['صورة الهوية الشخصية', 'كشف حساب بنكي', 'خطة العمل', 'تصريح الموقع'],
            status: 'مكتملة',
          },
          {
            title: 'المتطلبات المالية',
            items: ['رأس المال المطلوب', 'ضمانات بنكية', 'تأمين المشروع'],
            status: 'قيد المراجعة',
          },
          {
            title: 'المتطلبات التقنية',
            items: ['مواصفات المعدات', 'خطة التدريب', 'نظام الإدارة'],
            status: 'في الانتظار',
          },
        ],
        timeline: [
          {
            date: '2024-01-10',
            time: '10:30 ص',
            status: 'submitted',
            title: 'تم تقديم الطلب',
            description: 'تم استلام طلبكم بنجاح وإرسال رقم التتبع',
            completed: true,
            details: 'تم رفع جميع الوثائق المطلوبة بنجاح',
          },
          {
            date: '2024-01-11',
            time: '02:15 م',
            status: 'documents_verified',
            title: 'التحقق من الوثائق',
            description: 'تم التحقق من صحة الوثائق المرفوعة',
            completed: true,
            details: 'جميع الوثائق صحيحة ومطابقة للمعايير',
          },
          {
            date: '2024-01-12',
            time: '09:45 ص',
            status: 'initial_review',
            title: 'المراجعة الأولية',
            description: 'تم بدء المراجعة الأولية للطلب والخطة المالية',
            completed: true,
            details: 'تقييم أولي إيجابي للمشروع',
          },
          {
            date: '2024-01-14',
            time: '11:20 ص',
            status: 'location_assessment',
            title: 'تقييم الموقع',
            description: 'تم تقييم الموقع المقترح للمركز',
            completed: true,
            details: 'الموقع مناسب ويلبي جميع المتطلبات',
          },
          {
            date: '2024-01-15',
            time: '03:30 م',
            status: 'under_review',
            title: 'قيد المراجعة التفصيلية',
            description: 'يتم مراجعة الوثائق المالية والخطة التشغيلية',
            completed: false,
            current: true,
            details: 'مراجعة تفصيلية للجوانب المالية والتقنية',
          },
          {
            date: '2024-01-18',
            time: 'سيتم تحديدها',
            status: 'technical_review',
            title: 'المراجعة التقنية',
            description: 'مراجعة الخطة التقنية ومتطلبات المعدات',
            completed: false,
            details: 'تقييم الجوانب التقنية والمعدات المطلوبة',
          },
          {
            date: '2024-01-20',
            time: 'سيتم تحديدها',
            status: 'interview',
            title: 'المقابلة الشخصية',
            description: 'مقابلة مع فريق التوسع والاستثمار',
            completed: false,
            details: 'مناقشة تفاصيل المشروع والرؤية المستقبلية',
          },
          {
            date: '2024-01-22',
            time: 'سيتم تحديدها',
            status: 'final_review',
            title: 'المراجعة النهائية',
            description: 'مراجعة نهائية من قبل لجنة الاستثمار',
            completed: false,
            details: 'تقييم شامل واتخاذ القرار النهائي',
          },
          {
            date: '2024-01-25',
            time: 'سيتم تحديدها',
            status: 'decision',
            title: 'إعلان القرار النهائي',
            description: 'إعلان القرار النهائي وإرسال التفاصيل',
            completed: false,
            details: 'إشعار بالقرار النهائي والخطوات التالية',
          },
        ],
        contact: {
          name: 'فريق التوسع والاستثمار',
          email: 'expansion@carauction.ly',
          phone: '+218-91-234-5678',

          workingHours: 'الأحد - الخميس: 8:00 ص - 5:00 م',
          responseTime: '24 ساعة',
          manager: 'أ. سارة الفيتوري - مدير التوسع',
          managerEmail: 'sara.fituri@carauction.ly',
          supportTicket: 'SUP-2024-' + applicationId.slice(-3),
        },
        notifications: [
          {
            date: '2024-01-15',
            time: '03:30 م',
            type: 'update',
            title: 'تحديث حالة الطلب',
            message: 'تم الانتهاء من تقييم الموقع بنجاح. النتيجة: مناسب للمشروع.',
            read: false,
          },
          {
            date: '2024-01-14',
            time: '11:20 ص',
            type: 'info',
            title: 'زيارة تقييم الموقع',
            message: 'تم إجراء زيارة ميدانية لتقييم الموقع المقترح.',
            read: true,
          },
          {
            date: '2024-01-12',
            time: '09:45 ص',
            type: 'success',
            title: 'اجتياز المراجعة الأولية',
            message: 'تم اجتياز المراجعة الأولية بنجاح. الانتقال للمرحلة التالية.',
            read: true,
          },
        ],
      };

      setApplicationData(mockData);
    } catch (err) {
      setError('حدث خطأ في البحث. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'text-blue-600 bg-blue-100';
      case 'under_review':
        return 'text-yellow-600 bg-yellow-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'تم التقديم';
      case 'under_review':
        return 'قيد المراجعة';
      case 'approved':
        return 'تم القبول';
      case 'rejected':
        return 'تم الرفض';
      default:
        return 'غير محدد';
    }
  };

  return (
    <>
      <Head>
        <title>تتبع طلب الشراكة - مزاد السيارات</title>
        <meta name="description" content="تتبع حالة طلب إنشاء مركز الفحص والتقييم" />
      </Head>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-3xl font-bold text-gray-900">تتبع طلب الشراكة</h1>
            <p className="mx-auto max-w-2xl text-gray-600">
              أدخل رقم طلبك لمعرفة الحالة الحالية والخطوات التالية
            </p>
          </div>

          {/* Search Form */}
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-gray-700">رقم الطلب</label>
                <input
                  type="text"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: APP-2024-001"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? (
                    <div
                      className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                      style={{ width: 24, height: 24 }}
                      role="status"
                      aria-label="جاري التحميل"
                    />
                  ) : (
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  )}
                  {loading ? 'جاري البحث...' : 'بحث'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Application Details */}
          {applicationData && (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">رقم الطلب:</span>
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {applicationData.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                      <PrinterIcon className="h-4 w-4" />
                      طباعة
                    </button>
                    <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                      <ShareIcon className="h-4 w-4" />
                      مشاركة
                    </button>
                    <button
                      onClick={handleSearch}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      تحديث
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Overview */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">معلومات الطلب</h2>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(applicationData.status)}`}
                  >
                    {getStatusText(applicationData.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <h3 className="mb-3 flex items-center font-medium text-gray-900">
                      <UserIcon className="ml-2 h-5 w-5 text-blue-600" />
                      تفاصيل المتقدم
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <strong>الاسم:</strong> {applicationData.applicantName}
                      </p>
                      <p>
                        <strong>اسم المركز:</strong> {applicationData.centerName}
                      </p>
                      <p>
                        <strong>الموقع:</strong> {applicationData.region}, {applicationData.city}
                      </p>
                      <p>
                        <strong>البلد:</strong> {applicationData.country}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center font-medium text-gray-900">
                      <CalendarDaysIcon className="ml-2 h-5 w-5 text-green-600" />
                      التواريخ المهمة
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <strong>تاريخ التقديم:</strong> {applicationData.submittedDate}
                      </p>
                      <p>
                        <strong>آخر تحديث:</strong> {applicationData.lastUpdate}
                      </p>
                      <p>
                        <strong>القرار المتوقع:</strong> {applicationData.estimatedDecision}
                      </p>
                      <p>
                        <strong>الأولوية:</strong>{' '}
                        <span className="font-medium text-orange-600">
                          {applicationData.priority}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center font-medium text-gray-900">
                      <CurrencyDollarIcon className="ml-2 h-5 w-5 text-purple-600" />
                      تفاصيل الاستثمار
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <strong>خطة الاستثمار:</strong> {applicationData.investmentPlan}
                      </p>
                      <p>
                        <strong>قيمة الاستثمار:</strong> {applicationData.investmentAmount}
                      </p>
                      <p>
                        <strong>العائد المتوقع:</strong>{' '}
                        <span className="font-medium text-green-600">
                          {applicationData.expectedROI}
                        </span>
                      </p>
                      <p>
                        <strong>نقاط التقييم:</strong>{' '}
                        <span className="font-medium text-blue-600">
                          {applicationData.reviewScore}/100
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {applicationData.reviewNotes && (
                  <div className="mt-6 rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 flex items-center font-medium text-blue-900">
                      <InformationCircleIcon className="ml-2 h-5 w-5" />
                      ملاحظات المراجعة
                    </h4>
                    <p className="text-sm leading-relaxed text-blue-800">
                      {applicationData.reviewNotes}
                    </p>
                  </div>
                )}

                {/* Documents Status */}
                <div className="mt-6">
                  <h4 className="mb-4 flex items-center font-medium text-gray-900">
                    <DocumentTextIcon className="ml-2 h-5 w-5 text-gray-600" />
                    حالة الوثائق
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {Object.entries(applicationData.documentsStatus).map(([key, status]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <span className="text-sm text-gray-700">
                          {key === 'personalDocuments'
                            ? 'الوثائق الشخصية'
                            : key === 'financialDocuments'
                              ? 'الوثائق المالية'
                              : key === 'locationDocuments'
                                ? 'وثائق الموقع'
                                : 'خطة العمل'}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            status === 'مكتملة'
                              ? 'bg-green-100 text-green-700'
                              : status === 'قيد المراجعة'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {String(status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-gray-900">مراحل المعالجة</h2>

                <div className="space-y-6">
                  {applicationData.timeline.map((step, index) => (
                    <div key={index} className="flex items-start">
                      <div className="ml-4 flex-shrink-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                            step.completed
                              ? 'border-green-200 bg-green-100 text-green-600'
                              : step.current
                                ? 'border-blue-200 bg-blue-100 text-blue-600'
                                : 'border-gray-200 bg-gray-100 text-gray-400'
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircleIcon className="h-6 w-6" />
                          ) : step.current ? (
                            <ClockIcon className="h-6 w-6" />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-current"></div>
                          )}
                        </div>
                        {index < applicationData.timeline.length - 1 && (
                          <div
                            className={`mr-5 mt-2 h-8 w-0.5 ${
                              step.completed ? 'bg-green-200' : 'bg-gray-200'
                            }`}
                          ></div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pb-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h3
                            className={`text-base font-semibold ${
                              step.completed || step.current ? 'text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            {step.title}
                          </h3>
                          <div className="text-left">
                            <div className="text-xs text-gray-500">{step.date}</div>
                            {step.time && <div className="text-xs text-gray-400">{step.time}</div>}
                          </div>
                        </div>
                        <p
                          className={`mb-2 text-sm ${
                            step.completed || step.current ? 'text-gray-600' : 'text-gray-400'
                          }`}
                        >
                          {step.description}
                        </p>
                        {step.details && (
                          <p
                            className={`text-xs italic ${
                              step.completed || step.current ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            {step.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-6 flex items-center text-xl font-semibold text-gray-900">
                  <ArrowPathIcon className="ml-2 h-6 w-6 text-blue-600" />
                  الخطوات التالية
                </h2>
                <div className="space-y-4">
                  {applicationData.nextSteps.map((step, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="mb-2 flex items-center font-medium text-gray-900">
                            <div className="ml-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold leading-none text-blue-600">
                              {index + 1}
                            </div>
                            {step.step}
                          </h3>
                          <p className="mb-2 text-sm text-gray-600">{step.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <CalendarDaysIcon className="ml-1 h-4 w-4" />
                              الموعد المستهدف: {step.deadline}
                            </span>
                            <span className="flex items-center">
                              <UserIcon className="ml-1 h-4 w-4" />
                              المسؤول: {step.responsible}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements Status */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-6 flex items-center text-xl font-semibold text-gray-900">
                  <ChartBarIcon className="ml-2 h-6 w-6 text-purple-600" />
                  حالة المتطلبات
                </h2>
                <div className="space-y-4">
                  {applicationData.requirements.map((req, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{req.title}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            req.status === 'مكتملة'
                              ? 'bg-green-100 text-green-700'
                              : req.status === 'قيد المراجعة'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {req.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-center text-sm text-gray-600">
                            <div className="ml-2 h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-6 flex items-center text-xl font-semibold text-gray-900">
                  <ChatBubbleLeftRightIcon className="ml-2 h-6 w-6 text-orange-600" />
                  الإشعارات والتحديثات
                </h2>
                <div className="space-y-4">
                  {applicationData.notifications.map((notification, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 ${
                        !notification.read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                notification.type === 'update'
                                  ? 'bg-blue-500'
                                  : notification.type === 'success'
                                    ? 'bg-green-500'
                                    : notification.type === 'warning'
                                      ? 'bg-yellow-500'
                                      : 'bg-gray-500'
                              }`}
                            ></div>
                            <h3 className="font-medium text-gray-900">{notification.title}</h3>
                            {!notification.read && (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                جديد
                              </span>
                            )}
                          </div>
                          <p className="mb-2 text-sm text-gray-600">{notification.message}</p>
                          <div className="text-xs text-gray-500">
                            {notification.date} - {notification.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-6 flex items-center text-xl font-semibold text-gray-900">
                  <PhoneIcon className="ml-2 h-6 w-6 text-green-600" />
                  معلومات التواصل
                </h2>

                <div className="mb-6 rounded-lg bg-green-50 p-4">
                  <h3 className="mb-2 font-medium text-green-900">
                    {applicationData.contact.manager}
                  </h3>
                  <p className="text-sm text-green-700">مدير مخصص لمتابعة طلبكم</p>
                  <p className="mt-1 text-sm text-green-600">
                    {applicationData.contact.managerEmail}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-start">
                    <PhoneIcon className="ml-3 mt-1 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">الهاتف</p>
                      <p className="text-sm text-gray-600">{applicationData.contact.phone}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        متاح: {applicationData.contact.workingHours}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="mb-1 font-medium text-gray-900">وقت الاستجابة المتوقع</p>
                      <p className="text-gray-600">{applicationData.contact.responseTime}</p>
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-gray-900">رقم تذكرة الدعم</p>
                      <p className="font-mono text-gray-600">
                        {applicationData.contact.supportTicket}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TrackApplicationPage;
