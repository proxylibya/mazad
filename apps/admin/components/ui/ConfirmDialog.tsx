import { ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { AnimatedPresence } from '../unified/UnifiedAnimation';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  loading = false,
  icon,
  onConfirm,
  onCancel,
}) => {
  const confirmButtonClass =
    variant === 'danger'
      ? 'rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50'
      : 'rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50';

  const defaultIcon =
    variant === 'danger' ? (
      <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
    ) : (
      <QuestionMarkCircleIcon className="h-6 w-6 text-blue-400" />
    );

  const headerIcon = icon ?? defaultIcon;

  return (
    <AnimatedPresence
      show={open}
      variant="fade"
      duration="fast"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60"
    >
      <AnimatedPresence
        show={open}
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/70">
            {headerIcon}
          </div>
          <h4 className="text-lg font-semibold text-white">{title}</h4>
        </div>
        <div className="mb-6 text-sm text-slate-300">{message}</div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={confirmButtonClass}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري التنفيذ...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </AnimatedPresence>
    </AnimatedPresence>
  );
};

export default ConfirmDialog;
