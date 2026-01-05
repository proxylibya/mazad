/**
 * @sooq-mazad/ui
 * Shared UI Components - High Performance
 *
 * مكونات واجهة المستخدم المشتركة
 * محسنة للأداء العالي ومئات الآلاف من الزيارات
 */

import React, { memo } from 'react';

// ============ Form Components ============

// تصدير مكون الهاتف الموحد
export { default as UnifiedPhoneInput, arabCountries } from './UnifiedPhoneInput';
export type { Country, UnifiedPhoneInputProps } from './UnifiedPhoneInput';

// Input Component
export { Input } from './components/Input';
export type { InputProps } from './components/Input';

// ============ Feedback Components ============

// Spinner Component
export { Spinner } from './components/Spinner';
export type { SpinnerProps } from './components/Spinner';

// Skeleton Components
export { Skeleton, SkeletonAvatar, SkeletonCard } from './components/Skeleton';
export type { SkeletonProps } from './components/Skeleton';

export { MapControlButton } from './components/MapControlButton';
export type { MapControlButtonProps } from './components/MapControlButton';

// ============ Data Display Components ============

// Badge Component
export { Badge } from './components/Badge';
export type { BadgeProps } from './components/Badge';

// Avatar Component
export { Avatar } from './components/Avatar';
export type { AvatarProps } from './components/Avatar';

// ============ Overlay Components ============

// Modal Component
export { Modal } from './components/Modal';
export type { ModalProps } from './components/Modal';

// ============ Basic Components ============

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = memo(function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${fullWidth ? 'w-full' : ''} ${className} `}
    >
      {loading && (
        <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  className?: string;
}

const cardPadding = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const cardShadow = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export const Card = memo(function Card({
  children,
  padding = 'md',
  shadow = 'sm',
  border = true,
  className = '',
}: CardProps) {
  return (
    <div
      className={`rounded-xl bg-white ${cardPadding[padding]} ${cardShadow[shadow]} ${border ? 'border border-gray-200' : ''} ${className} `}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
