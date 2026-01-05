import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import ArrowUturnRightIcon from '@heroicons/react/24/outline/ArrowUturnRightIcon';
import KeyIcon from '@heroicons/react/24/outline/KeyIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import React, { useEffect, useRef, useState } from 'react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onBackToLogin: () => void;
  onPasswordResetSuccess: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  onBackToLogin,
  onPasswordResetSuccess,
}) => {
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // عداد الوقت
  useEffect(() => {
    if (!isOpen || step !== 'verify' || timeLeft <= 0) {
      if (timeLeft <= 0) setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, step, timeLeft]);

  // إغلاق النافذة عند الضغط على Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // إعادة تعيين النموذج عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      setStep('request');
      setVerificationCode(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setTimeLeft(120);
      setCanResend(false);
    }
  }, [isOpen]);

  const handleRequestReset = async () => {
    setIsLoading(true);
    setError('');

    try {
      // محاكاة إرسال كود الاسترجاع
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStep('verify');
      setTimeLeft(120);
      setCanResend(false);
    } catch (error) {
      setError('حدث خطأ أثناء إرسال كود الاسترجاع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError('');

    // الانتقال للحقل التالي
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('يرجى إدخال الكود كاملاً');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // محاكاة التحقق من الكود
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStep('reset');
    } catch (error) {
      setError('الكود غير صحيح. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim()) {
      setError('يرجى إدخال كلمة المرور الجديدة');
      return;
    }

    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // محاكاة إعادة تعيين كلمة المرور
      await new Promise((resolve) => setTimeout(resolve, 2000));

      onPasswordResetSuccess();
    } catch (error) {
      setError('حدث خطأ أثناء إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCanResend(false);
    setTimeLeft(120);
    setVerificationCode(['', '', '', '', '', '']);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      setError('فشل في إعادة إرسال الكود. يرجى المحاولة مرة أخرى.');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    switch (step) {
      case 'request':
        return 'استرجاع كلمة المرور';
      case 'verify':
        return 'تأكيد الكود';
      case 'reset':
        return 'كلمة مرور جديدة';
      default:
        return 'استرجاع كلمة المرور';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'request':
        return 'سنرسل لك كود لاسترجاع كلمة المرور';
      case 'verify':
        return 'أدخل الكود المرسل إلى هاتفك';
      case 'reset':
        return 'أدخل كلمة المرور الجديدة';
      default:
        return '';
    }
  };

  return (
    <div className="login-modal-overlay fixed inset-0 z-50 flex items-center justify-center">
      {/* خلفية مظلمة */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* النافذة المنبثقة */}
      <div className="shadow-custom login-modal-content login-modal relative mx-4 w-full max-w-md rounded-lg bg-white">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between border-b p-6" dir="rtl">
          <div className="flex items-center gap-4">
            {/* زر الإغلاق المحسن */}
            <button
              onClick={onClose}
              className="group flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 transition-all duration-200 hover:border-red-300 hover:bg-red-100"
              title="إغلاق"
            >
              <XMarkIcon className="h-6 w-6 text-red-600 group-hover:text-red-700" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{getStepTitle()}</h2>
              <p className="text-sm text-gray-600">{getStepDescription()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* زر رجوع */}
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-800"
            >
              رجوع
              <ArrowUturnRightIcon className="h-4 w-4" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <KeyIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* المحتوى */}
        <div className="p-6" dir="rtl">
          {/* عرض رقم الهاتف */}
          <div className="mb-6 text-center">
            <p className="mb-2 text-gray-700">رقم الهاتف:</p>
            <p className="text-lg font-bold text-gray-900" dir="ltr">
              {phoneNumber}
            </p>
            <button
              onClick={onBackToLogin}
              className="mx-auto mt-2 flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              العودة لتسجيل الدخول
            </button>
          </div>

          {error && <div className="error-message mb-4">{error}</div>}

          {/* خطوة طلب الاسترجاع */}
          {step === 'request' && (
            <div className="space-y-6">
              <div className="rounded-lg bg-orange-50 p-4">
                <h4 className="mb-2 font-medium text-orange-900">كيف يعمل استرجاع كلمة المرور:</h4>
                <ol className="space-y-1 text-sm text-orange-800">
                  <li>1. سنرسل كود تحقق إلى رقم هاتفك</li>
                  <li>2. أدخل الكود للتأكيد</li>
                  <li>3. أدخل كلمة مرور جديدة</li>
                </ol>
              </div>

              <button
                onClick={handleRequestReset}
                disabled={isLoading}
                className={`next-button btn-primary w-full rounded-lg px-4 py-3 text-lg font-bold text-white transition-all ${
                  isLoading ? 'cursor-not-allowed bg-gray-400' : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                      style={{ width: 24, height: 24 }}
                      role="status"
                      aria-label="جاري التحميل"
                    />
                    <span className="sr-only">جاري الإرسال</span>
                  </div>
                ) : (
                  'إرسال كود الاسترجاع'
                )}
              </button>
            </div>
          )}

          {/* خطوة التحقق من الكود */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              {/* حقول الكود */}
              <div className="flex justify-center gap-3" dir="ltr">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="verification-code-input h-12 w-12 rounded-lg border-2 border-gray-300 text-center text-xl font-bold transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || verificationCode.join('').length !== 6}
                className={`next-button btn-primary w-full rounded-lg px-4 py-3 text-lg font-bold text-white transition-all ${
                  isLoading || verificationCode.join('').length !== 6
                    ? 'cursor-not-allowed bg-gray-400'
                    : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                      style={{ width: 24, height: 24 }}
                      role="status"
                      aria-label="جاري التحميل"
                    />
                    <span className="sr-only">جاري التحقق</span>
                  </div>
                ) : (
                  'تأكيد الكود'
                )}
              </button>

              {/* إعادة الإرسال */}
              <div className="text-center">
                {!canResend ? (
                  <p className="text-sm text-gray-600">
                    يمكنك طلب كود جديد خلال:{' '}
                    <span className="font-bold text-orange-600">{formatTime(timeLeft)}</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    إعادة إرسال الكود
                  </button>
                )}
              </div>
            </form>
          )}

          {/* خطوة إعادة تعيين كلمة المرور */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="mb-4 flex items-center justify-center gap-2 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">تم التحقق من الكود بنجاح</span>
              </div>

              {/* كلمة المرور الجديدة */}
              <div>
                <label htmlFor="newPassword" className="mb-2 block text-sm font-bold text-gray-900">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 transition-colors focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* تأكيد كلمة المرور */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-bold text-gray-900"
                >
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="أعد إدخال كلمة المرور"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 transition-colors focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !newPassword.trim() || !confirmPassword.trim()}
                className={`next-button btn-primary w-full rounded-lg px-4 py-3 text-lg font-bold text-white transition-all ${
                  isLoading || !newPassword.trim() || !confirmPassword.trim()
                    ? 'cursor-not-allowed bg-gray-400'
                    : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                      style={{ width: 24, height: 24 }}
                      role="status"
                      aria-label="جاري التحميل"
                    />
                    <span className="sr-only">جاري الحفظ</span>
                  </div>
                ) : (
                  'حفظ كلمة المرور الجديدة'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
