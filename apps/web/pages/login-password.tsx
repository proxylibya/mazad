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
import { BackIcon, ForwardIcon } from '../components/common/icons/RTLIcon';
import { saveUserSession } from '../utils/authUtils';
import { safeApiCall } from '../utils/hydrationErrorHandler';

const LoginPasswordPage: React.FC = () => {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 5000);
  };

  useEffect(() => {
    if (!router.isReady) return;

    const queryPhone = router.query.phone as string | undefined;
    const callbackUrl = router.query.callbackUrl as string | undefined;
    const redirect = router.query.redirect as string | undefined;

    if (queryPhone) {
      setPhone(queryPhone);
      return;
    }

    let target = '/';
    if (callbackUrl) {
      target = callbackUrl;
    } else if (redirect) {
      try {
        target = decodeURIComponent(redirect);
      } catch {
        target = redirect;
      }
    }

    setIsRedirecting(true);

    const query: Record<string, string> = {};
    if (target && target !== '/') {
      query.callbackUrl = target;
    }

    router.replace({
      pathname: '/login',
      query,
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    if (!phone) {
      setError('حدث خطأ في رقم الهاتف، يرجى المحاولة مرة أخرى');
      return;
    }

    setIsLoading(true);

    try {
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
          phone,
          password: password.trim(),
        }),
      });

      if (data.success && data.data) {
        if (data.data.token && data.data.user) {
          saveUserSession(data.data.user, data.data.token, true);
        }
        if (data.data.wallet) {
          localStorage.setItem('wallet', JSON.stringify(data.data.wallet));
        }

        showNotification('success', 'تم تسجيل الدخول بنجاح');

        setTimeout(() => {
          const callbackUrl = router.query.callbackUrl as string | undefined;
          const redirect = router.query.redirect as string | undefined;
          let target = '/';

          if (callbackUrl) {
            target = callbackUrl;
          } else if (redirect) {
            try {
              target = decodeURIComponent(redirect);
            } catch {
              target = redirect;
            }
          }

          router.push(target);
        }, 1000);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'حدث خطأ غير متوقع في تسجيل الدخول';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isRedirecting || (!phone && !router.query.phone)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">جاري التحويل...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>تسجيل الدخول برقم الهاتف | سوق المزاد</title>
        <meta name="description" content="تسجيل الدخول باستخدام رقم الهاتف وكلمة المرور" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
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

        <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
                <UserIcon className="h-7 w-7 text-white" />
              </div>
              <h2 className="mb-1 text-2xl font-bold text-gray-900">تأكيد كلمة المرور</h2>
              <p className="text-sm text-gray-600">أدخل كلمة المرور لحسابك</p>
              {phone && (
                <p className="mt-2 text-xs text-gray-500">
                  رقم الهاتف: <span className="font-medium">{phone}</span>
                </p>
              )}
            </div>

            <div className="rounded-xl bg-white p-8 shadow-lg">
              <form onSubmit={handleLogin} className="space-y-6">
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
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
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

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
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

              <div className="mt-6 space-y-4">
                <div className="text-center">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-blue-600 transition-colors hover:text-blue-800"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                </div>
              </div>
            </div>

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

export default LoginPasswordPage;
