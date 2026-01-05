import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CurrencyDollarIcon from '@heroicons/react/24/outline/CurrencyDollarIcon';
// import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import { LoadingButton } from '../components/ui';
import QuestionMarkCircleIcon from '@heroicons/react/24/outline/QuestionMarkCircleIcon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import Head from 'next/head';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { OpensooqNavbar } from '../components/common';
import PhoneInputField from '../components/PhoneInputField';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showFloatingSubmitButton, setShowFloatingSubmitButton] = useState(false);
  // تم الاستغناء عن تتبع كود الدولة في صفحة التواصل لأنها لا تُرسل رقم الهاتف إلى API

  // مراقبة التمرير لإظهار/إخفاء زر الإرسال الثابت
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const hasContent = Boolean(formData.name && formData.phone && formData.message);
      setShowFloatingSubmitButton(scrollY > 300 && hasContent && !isSubmitted);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [formData, isSubmitted]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // محاكاة إرسال الرسالة
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsSubmitted(true);
      setFormData({
        name: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      alert('حدث خطأ في إرسال الرسالة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>تواصل معنا | سوق المزاد</title>
        <meta
          name="description"
          content="تواصل مع فريق دعم موقع مزاد السيارات للحصول على المساعدة والدعم"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
        <OpensooqNavbar />

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-6 text-4xl font-bold md:text-5xl">تواصل معنا</h1>
              <p className="mx-auto mb-8 max-w-3xl text-xl text-blue-100">
                نحن هنا لمساعدتك! تواصل معنا للحصول على الدعم أو الإجابة على استفساراتك
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {/* أنواع الاستفسارات */}
          <div className="mb-16">
            <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">
              كيف يمكننا مساعدتك؟
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
              اختر نوع الاستفسار للحصول على المساعدة المناسبة بشكل أسرع
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="cursor-pointer rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">استفسارات عامة</h3>
                <p className="mb-4 text-sm text-gray-600">أسئلة حول الموقع وكيفية الاستخدام</p>
                <div className="text-sm font-medium text-blue-600">متوسط الرد: ساعتين</div>
              </div>

              <div className="cursor-pointer rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <TrophyIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">دعم المزادات</h3>
                <p className="mb-4 text-sm text-gray-600">مساعدة في المزايدة والمزادات</p>
                <div className="text-sm font-medium text-green-600">متوسط الرد: 30 دقيقة</div>
              </div>

              <div className="cursor-pointer rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">الدفع والفواتير</h3>
                <p className="mb-4 text-sm text-gray-600">مشاكل الدفع والمعاملات المالية</p>
                <div className="text-sm font-medium text-purple-600">متوسط الرد: ساعة واحدة</div>
              </div>

              <div className="cursor-pointer rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">الإبلاغ عن مشكلة</h3>
                <p className="mb-4 text-sm text-gray-600">مشاكل تقنية أو إبلاغ عن محتوى</p>
                <div className="text-sm font-medium text-orange-600">متوسط الرد: 15 دقيقة</div>
              </div>

              <div className="cursor-pointer rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">الشراكات التجارية</h3>
                <p className="mb-4 text-sm text-gray-600">فرص الشراكة والاستثمار</p>
                <div className="text-sm font-medium text-indigo-600">متوسط الرد: 4 ساعات</div>
              </div>

              <div className="cursor-pointer rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                  <UserGroupIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">خدمة العملاء</h3>
                <p className="mb-4 text-sm text-gray-600">مساعدة في إدارة الحساب والإعدادات</p>
                <div className="text-sm font-medium text-red-600">متوسط الرد: ساعة واحدة</div>
              </div>
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-3">
            {/* معلومات التواصل */}
            <div className="lg:col-span-1">
              <h2 className="mb-8 text-2xl font-bold text-gray-900">معلومات التواصل</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <PhoneIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium text-gray-900">الهاتف</h3>
                    <p className="text-gray-600">+218 21 123 4567</p>
                    <p className="text-gray-600">+218 91 234 5678</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <MapPinIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium text-gray-900">العنوان</h3>
                    <p className="text-gray-600">شارع الجمهورية، طرابلس، ليبيا</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                    <ClockIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium text-gray-900">ساعات العمل</h3>
                    <p className="text-gray-600">السبت - الخميس: 8:00 ص - 6:00 م</p>
                    <p className="text-gray-600">الجمعة: مغلق</p>
                  </div>
                </div>
              </div>

              {/* دعم سريع */}
              <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
                <h3 className="mb-3 flex items-center gap-2 font-bold text-blue-900">
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  دعم سريع
                </h3>
                <p className="mb-4 text-sm text-blue-800">
                  للحصول على مساعدة فورية، يمكنك استخدام نظام المراسلة الداخلي في الموقع
                </p>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                  إرسال رسالة
                </button>
              </div>
            </div>

            {/* نموذج التواصل */}
            <div className="lg:col-span-2">
              <div className="rounded-xl bg-white p-8 shadow-lg">
                <h2 className="mb-8 text-2xl font-bold text-gray-900">أرسل لنا رسالة</h2>

                {isSubmitted ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">تم إرسال رسالتك بنجاح!</h3>
                    <p className="mb-6 text-gray-600">سنتواصل معك خلال 24 ساعة</p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      إرسال رسالة أخرى
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          الاسم الكامل *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="أدخل اسمك الكامل"
                        />
                      </div>
                    </div>

                    <div>
                      <PhoneInputField
                        label="رقم الهاتف"
                        value={formData.phone}
                        onChange={(v: string) => setFormData((prev) => ({ ...prev, phone: v }))}
                        placeholder="أدخل رقم الهاتف"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        موضوع الرسالة *
                      </label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">اختر موضوع الرسالة</option>
                        <option value="support">دعم تقني</option>
                        <option value="transport">استفسار عن خدمات النقل</option>
                        <option value="auction">استفسار عن المزادات</option>
                        <option value="account">مشكلة في الحساب</option>
                        <option value="payment">مشكلة في الدفع</option>
                        <option value="suggestion">اقتراح أو تحسين</option>
                        <option value="complaint">شكوى</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        الرسالة *
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        placeholder="اكتب رسالتك هنا..."
                      />
                    </div>

                    <LoadingButton
                      type="submit"
                      isLoading={isSubmitting}
                      loadingText="جاري الإرسال..."
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      إرسال الرسالة
                    </LoadingButton>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* إحصائيات الدعم */}
          <div className="mt-16 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-8">
            <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
              إحصائيات خدمة العملاء
            </h2>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-blue-600">98%</div>
                <div className="text-sm text-gray-600">رضا العملاء</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-green-600">15 دقيقة</div>
                <div className="text-sm text-gray-600">متوسط وقت الرد</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-600">دعم متواصل</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-orange-600">10,000+</div>
                <div className="text-sm text-gray-600">استفسار شهرياً</div>
              </div>
            </div>
          </div>

          {/* أسئلة شائعة */}
          <div className="mt-16">
            <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">أسئلة شائعة</h2>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-3 font-bold text-gray-900">كيف يمكنني طلب خدمة نقل؟</h3>
                <p className="text-sm text-gray-600">
                  يمكنك طلب خدمة النقل من خلال صفحة خدمات النقل، أو استخدام حاسبة التكلفة لمعرفة
                  السعر المتوقع.
                </p>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-3 font-bold text-gray-900">هل خدمات النقل مؤمنة؟</h3>
                <p className="text-sm text-gray-600">
                  نعم، جميع خدمات النقل تشمل تأمين شامل على السيارة المنقولة ضد أي أضرار محتملة.
                </p>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-3 font-bold text-gray-900">كم يستغرق وقت النقل؟</h3>
                <p className="text-sm text-gray-600">
                  يعتمد وقت النقل على المسافة ونوع الخدمة المطلوبة، عادة ما يكون بين يوم إلى 3 أيام.
                </p>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-3 font-bold text-gray-900">هل يمكنني تتبع موقع سيارتي؟</h3>
                <p className="text-sm text-gray-600">
                  نعم، نوفر خدمة التتبع المباشر عبر GPS لمعرفة موقع سيارتك في الوقت الفعلي.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* زر الإرسال الثابت في أسفل الشاشة */}
      {showFloatingSubmitButton && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/50 bg-white/95 shadow-2xl backdrop-blur-lg">
          <div className="mx-auto max-w-4xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-gray-700">رسالتك جاهزة للإرسال</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-xl transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div
                      className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                      style={{ width: 24, height: 24 }}
                      role="status"
                      aria-label="جاري التحميل"
                    />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <ChatBubbleLeftRightIcon className="h-6 w-6" />
                    <span>إرسال الرسالة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactPage;
