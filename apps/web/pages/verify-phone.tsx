import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { OpensooqNavbar } from '../components/common';
import { processPhoneNumber } from '../utils/phoneUtils';

interface VerificationFormData {
  code: string;
}

const VerifyPhonePage: React.FC = () => {
  const router = useRouter();
  const { phone, type } = router.query;
  const [formData, setFormData] = useState<VerificationFormData>({ code: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 دقائق
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [displayPhone, setDisplayPhone] = useState('');

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (phone) {
      const phoneResult = processPhoneNumber(phone as string);
      if (phoneResult.isValid) {
        setDisplayPhone(phoneResult.displayNumber);
      } else {
        setDisplayPhone(phone as string);
      }
    }
  }, [phone]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newCode = formData.code.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('');

    setFormData({ code: updatedCode });
    setError('');

    // الانتقال للحقل التالي
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // إرسال الكود تلقائياً عند اكتماله
    if (updatedCode.length === 6) {
      handleSubmit(null, updatedCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !formData.code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent | null, code?: string) => {
    if (e) e.preventDefault();

    const verificationCode = code || formData.code;

    if (verificationCode.length !== 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          code: verificationCode,
          type: type || 'password_reset',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'رمز التحقق غير صحيح');
      }

      setSuccess('تم التحقق بنجاح!');

      // التوجيه حسب نوع التحقق
      setTimeout(() => {
        if (type === 'password_reset') {
          router.push(
            `/reset-password-new?phone=${encodeURIComponent(phone as string)}&token=${data.token}`,
          );
        } else if (type === 'registration') {
          router.push('/login?verified=true');
        } else {
          router.push('/');
        }
      }, 1500);
    } catch (error) {
      console.error('خطأ في التحقق:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ أثناء التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          type: type || 'password_reset',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في إعادة إرسال الرمز');
      }

      setSuccess('تم إعادة إرسال رمز التحقق');
      setTimeLeft(300);
      setCanResend(false);
      setFormData({ code: '' });

      // مسح الحقول وإعادة التركيز على الأول
      codeInputRefs.current.forEach((ref) => {
        if (ref) ref.value = '';
      });
      codeInputRefs.current[0]?.focus();
    } catch (error) {
      console.error('خطأ في إعادة الإرسال:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ أثناء إعادة الإرسال');
    } finally {
      setIsResending(false);
    }
  };

  const getPageTitle = () => {
    switch (type) {
      case 'password_reset':
        return 'تحقق من رقم الهاتف - إعادة تعيين كلمة المرور';
      case 'registration':
        return 'تحقق من رقم الهاتف - إنشاء حساب جديد';
      default:
        return 'تحقق من رقم الهاتف';
    }
  };

  const getPageDescription = () => {
    switch (type) {
      case 'password_reset':
        return 'أدخل رمز التحقق المرسل إلى هاتفك لإعادة تعيين كلمة المرور';
      case 'registration':
        return 'أدخل رمز التحقق المرسل إلى هاتفك لتأكيد إنشاء الحساب';
      default:
        return 'أدخل رمز التحقق المرسل إلى هاتفك';
    }
  };

  return (
    <>
      <Head>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <OpensooqNavbar />

      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* الشعار والعنوان */}
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <PhoneIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="mb-2 text-3xl font-bold text-gray-900">تحقق من رقم الهاتف</h2>
            <p className="mb-8 text-sm text-gray-600">
              أدخل رمز التحقق المرسل إلى
              <br />
              <span className="font-semibold text-gray-900">{displayPhone}</span>
            </p>
          </div>

          {/* النموذج */}
          <div className="rounded-lg bg-white px-4 py-8 shadow-xl sm:px-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* رسائل النجاح والخطأ */}
              {success && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-600" />
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* حقول رمز التحقق */}
              <div>
                <label className="mb-4 block text-center text-sm font-medium text-gray-700">
                  رمز التحقق
                </label>
                <div className="mb-6 flex justify-center gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        codeInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              {/* العداد التنازلي */}
              <div className="text-center">
                {timeLeft > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4" />
                    <span>إعادة الإرسال خلال {formatTime(timeLeft)}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="mx-auto flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    {isResending ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowPathIcon className="h-4 w-4" />
                    )}
                    إعادة إرسال الرمز
                  </button>
                )}
              </div>

              {/* زر التحقق */}
              <button
                type="submit"
                disabled={isLoading || formData.code.length !== 6}
                className="flex w-full justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'تحقق من الرمز'}
              </button>
            </form>

            {/* رابط العودة */}
            <div className="mt-6 text-center">
              <Link
                href="/forgot-password"
                className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-500"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                العودة لصفحة استعادة كلمة المرور
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyPhonePage;
