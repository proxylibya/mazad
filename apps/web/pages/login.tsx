import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ExclamationCircleIcon from '@heroicons/react/24/outline/ExclamationCircleIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import EyeSlashIcon from '@heroicons/react/24/outline/EyeSlashIcon';
import LockClosedIcon from '@heroicons/react/24/outline/LockClosedIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import PhoneInputField, { type Country } from '../components/PhoneInputField';
import { BackIcon, ForwardIcon } from '../components/common/icons/RTLIcon';
import { saveUserSession } from '../utils/authUtils';
import { safeApiCall } from '../utils/hydrationErrorHandler';
import { processPhoneNumber } from '../utils/phoneUtils';

const LoginPage: React.FC = () => {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [dialCode, setDialCode] = useState('+218');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const [siteElements, setSiteElements] = useState<Record<string, boolean> | null>(null);

  // دالة لإظهار الإشعارات
  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 5000);
  };

  // إعادة توجيه ذكي حسب حالة المستخدم والمعاملات
  useEffect(() => {
    // منع التنفيذ المتكرر في وضع التطوير (React StrictMode)
    if (!router.isReady) return;

    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const callbackUrl = router.query.callbackUrl as string;

    // منع إعادة التوجيه إذا كان الطلب لصفحة إدارية
    // لأن صفحات الإدارة تتطلب مصادقة منفصلة
    const isAdminRequest = callbackUrl && callbackUrl.startsWith('/admin');

    // إعادة توجيه فقط إذا كانت هناك جلسة مستخدم عادي صحيحة
    // وليس طلباً لصفحة إدارية
    if (user && token && !isAdminRequest) {
      const redirectUrl = callbackUrl || '/';
      router.push(redirectUrl);
      return;
    }

    // إذا كان هناك رقم هاتف في الاستعلام، الانتقال إلى صفحة كلمة المرور مباشرة
    if (router.query.phone) {
      const params = new URLSearchParams(router.query as Record<string, string>);
      const qs = params.toString();
      router.replace('/login-password' + (qs ? `?${qs}` : ''));
      return;
    }

    // لا حاجة لمزيد من المعالجة - نحن بالفعل على صفحة /login
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.callbackUrl, router.query.phone]);

  // جلب إعدادات العناصر القابلة للإظهار/الإخفاء
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/site-settings');
        const data = await res.json();
        if (mounted && data?.elements) setSiteElements(data.elements as Record<string, boolean>);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // معالجة تسجيل الدخول
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // التحقق من صحة البيانات
      if (!phoneNumber.trim()) {
        throw new Error('يرجى إدخال رقم الهاتف');
      }
      if (!password.trim()) {
        throw new Error('يرجى إدخال كلمة المرور');
      }

      const phoneResult = processPhoneNumber(`${dialCode}${phoneNumber.trim()}`);
      const phoneForApi = phoneResult.isValid
        ? phoneResult.fullNumber
        : `${dialCode}${phoneNumber.trim()}`;

      // محاولة تسجيل الدخول باستخدام safeApiCall
      const data = await safeApiCall<{
        success: boolean;
        message?: string;
        data?: {
          user: any;
          token: string;
          wallet?: any;
        };
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          phone: phoneForApi,
          password: password.trim(),
        }),
      });

      // حفظ بيانات المستخدم
      if (data.success && data.data) {
        // حفظ الجلسة وإطلاق أحداث التحديث
        if (data.data.token && data.data.user) {
          saveUserSession(data.data.user, data.data.token, true);
        }
        if (data.data.wallet) {
          localStorage.setItem('wallet', JSON.stringify(data.data.wallet));
        }

        showNotification('success', 'تم تسجيل الدخول بنجاح');

        // إعادة التوجيه بعد تأخير قصير
        setTimeout(() => {
          const callbackUrl = router.query.callbackUrl as string;
          if (callbackUrl) {
            router.push(callbackUrl);
          } else {
            router.push('/');
          }
        }, 1000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
      showNotification('error', error instanceof Error ? error.message : 'حدث خطأ في تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>تسجيل دخول الإدارة | سوق المزاد</title>
        <meta name="description" content="تسجيل دخول الإدارة للوصول إلى لوحة التحكم" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
        {/* إشعارات */}
        {notification.show && (
          <div className="fixed right-4 top-4 z-50 w-full max-w-sm">
            <div
              className={`rounded-lg p-4 shadow-lg ${
                notification.type === 'success'
                  ? 'bg-green-500 text-white'
                  : notification.type === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-yellow-500 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' && <CheckCircleIcon className="h-5 w-5" />}
                {notification.type === 'error' && <ExclamationCircleIcon className="h-5 w-5" />}
                {notification.type === 'warning' && <ExclamationCircleIcon className="h-5 w-5" />}
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* المحتوى الرئيسي */}
        <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            {/* الشعار والعنوان */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
                <UserIcon className="h-7 w-7 text-white" />
              </div>
              <h2 className="mb-1 text-2xl font-bold text-gray-900">تسجيل الدخول</h2>
              <p className="text-sm text-gray-600">أدخل بياناتك للوصول إلى حسابك</p>
            </div>

            {/* نموذج تسجيل الدخول */}
            <div className="rounded-xl bg-white p-8 shadow-lg">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* رقم الهاتف أو اسم المستخدم */}
                <div>
                  <PhoneInputField
                    value={phoneNumber}
                    onChange={(v) => {
                      setPhoneNumber(v);
                      if (error) setError('');
                    }}
                    onCountryChange={(c: Country) => {
                      setDialCode(c.code);
                    }}
                    label="رقم الموبايل"
                    required
                    placeholder="أدخل رقم الموبايل"
                    className="mb-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">للاختبار: admin أو أي رقم هاتف مسجل</p>
                </div>

                {/* كلمة المرور */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    كلمة المرور
                  </label>
                  <div className="input-icon-container relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="كلمة المرور"
                      className="input-with-both-icons block w-full rounded-lg border border-gray-300 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="input-icon-right force-show-icon">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="input-icon-left"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* تذكرني */}
                {siteElements?.['login_remember_me'] !== false && (
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-900">
                      تذكرني
                    </label>
                  </div>
                )}

                {/* رسالة الخطأ */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* زر تسجيل الدخول */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                        style={{ width: 24, height: 24 }}
                        role="status"
                        aria-label="جاري التحميل"
                      />
                      <span>تسجيل الدخول</span>
                    </div>
                  ) : (
                    <>
                      تسجيل الدخول
                      <ForwardIcon className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* روابط إضافية */}
              <div className="mt-6 space-y-4">
                {siteElements?.['login_forgot_password_link'] !== false && (
                  <div className="text-center">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-blue-600 transition-colors hover:text-blue-800"
                    >
                      نسيت كلمة المرور؟
                    </Link>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">أو</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    ليس لديك حساب؟{' '}
                    <Link
                      href="/register"
                      className="font-medium text-blue-600 transition-colors hover:text-blue-800"
                    >
                      إنشاء حساب جديد
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* رابط العودة للصفحة الرئيسية */}
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-800"
              >
                <BackIcon className="h-4 w-4" />
                العودة للصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
