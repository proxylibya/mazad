/**
 * نظام موحد عالمي لأزرار الإجراءات في جداول الإدارة
 * Unified Actions Column System for Admin Tables
 *
 * يستخدم في جميع صفحات الإدارة لتوحيد تجربة المستخدم
 */
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  EyeIcon,
  NoSymbolIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import React, { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';

// أنواع الإجراءات المتاحة
export type ActionType =
  | 'view' // عرض التفاصيل
  | 'edit' // تعديل
  | 'delete' // حذف
  | 'ban' // حظر/إلغاء حظر
  | 'suspend' // تعليق/إلغاء تعليق
  | 'activate' // تفعيل
  | 'approve' // موافقة
  | 'reject' // رفض
  | 'restore' // استعادة
  | 'verify'; // توثيق

// واجهة تعريف الإجراء
export interface ActionConfig {
  type: ActionType;
  label?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'amber' | 'emerald';
  onClick?: (row: any) => void | Promise<void>;
  href?: string | ((row: any) => string);
  confirm?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  condition?: (row: any) => boolean;
  disabled?: (row: any) => boolean;
  tooltip?: string | ((row: any) => string);
}

// واجهة خصائص المكون
export interface UnifiedActionsColumnProps {
  row: any;
  actions: ActionConfig[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  maxVisible?: number;
  onActionComplete?: () => void;
}

// ألوان الإجراءات
const actionColors: Record<string, string> = {
  blue: 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10',
  green: 'text-green-400 hover:text-green-300 hover:bg-green-500/10',
  yellow: 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10',
  red: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
  gray: 'text-slate-400 hover:text-slate-300 hover:bg-slate-500/10',
  purple: 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10',
  amber: 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
  emerald: 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10',
};

// أيقونات الإجراءات الافتراضية
const defaultIcons: Record<ActionType, React.ReactNode> = {
  view: <EyeIcon className="h-5 w-5" />,
  edit: <PencilIcon className="h-5 w-5" />,
  delete: <TrashIcon className="h-5 w-5" />,
  ban: <NoSymbolIcon className="h-5 w-5" />,
  suspend: <PauseIcon className="h-5 w-5" />,
  activate: <PlayIcon className="h-5 w-5" />,
  approve: <CheckCircleIcon className="h-5 w-5" />,
  reject: <XCircleIcon className="h-5 w-5" />,
  restore: <ArrowPathIcon className="h-5 w-5" />,
  verify: <DocumentCheckIcon className="h-5 w-5" />,
};

// ألوان الإجراءات الافتراضية
const defaultColors: Record<ActionType, string> = {
  view: 'blue',
  edit: 'amber',
  delete: 'red',
  ban: 'red',
  suspend: 'yellow',
  activate: 'green',
  approve: 'green',
  reject: 'red',
  restore: 'emerald',
  verify: 'purple',
};

// تسميات الإجراءات الافتراضية
const defaultLabels: Record<ActionType, string> = {
  view: 'عرض',
  edit: 'تعديل',
  delete: 'حذف',
  ban: 'حظر',
  suspend: 'تعليق',
  activate: 'تفعيل',
  approve: 'موافقة',
  reject: 'رفض',
  restore: 'استعادة',
  verify: 'توثيق',
};

// رسائل التأكيد الافتراضية
const defaultConfirmMessages: Record<ActionType, { title: string; message: string }> = {
  view: { title: '', message: '' },
  edit: { title: '', message: '' },
  delete: {
    title: 'تأكيد الحذف',
    message: 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.',
  },
  ban: { title: 'تأكيد الحظر', message: 'هل أنت متأكد من حظر هذا العنصر؟' },
  suspend: { title: 'تأكيد التعليق', message: 'هل أنت متأكد من تعليق هذا العنصر؟' },
  activate: { title: 'تأكيد التفعيل', message: 'هل أنت متأكد من تفعيل هذا العنصر؟' },
  approve: { title: 'تأكيد الموافقة', message: 'هل أنت متأكد من الموافقة على هذا العنصر؟' },
  reject: { title: 'تأكيد الرفض', message: 'هل أنت متأكد من رفض هذا العنصر؟' },
  restore: { title: 'تأكيد الاستعادة', message: 'هل أنت متأكد من استعادة هذا العنصر؟' },
  verify: { title: 'تأكيد التوثيق', message: 'هل أنت متأكد من توثيق هذا العنصر؟' },
};

// أحجام الأزرار
const buttonSizes: Record<string, string> = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

// أحجام الأيقونات
const iconSizes: Record<string, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * مكون أزرار الإجراءات الموحد
 */
export default function UnifiedActionsColumn({
  row,
  actions,
  size = 'md',
  showLabels = false,
  onActionComplete,
}: UnifiedActionsColumnProps) {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: ActionConfig | null;
  }>({ isOpen: false, action: null });
  const [loading, setLoading] = useState(false);

  // تنفيذ الإجراء
  const executeAction = async (action: ActionConfig) => {
    if (action.confirm) {
      setConfirmModal({ isOpen: true, action });
    } else if (action.onClick) {
      setLoading(true);
      try {
        await action.onClick(row);
        onActionComplete?.();
      } finally {
        setLoading(false);
      }
    }
  };

  // تأكيد وتنفيذ الإجراء
  const confirmAndExecute = async () => {
    if (!confirmModal.action?.onClick) return;

    setLoading(true);
    try {
      await confirmModal.action.onClick(row);
      onActionComplete?.();
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, action: null });
    }
  };

  // فلترة الإجراءات المتاحة
  const visibleActions = actions.filter((action) => {
    if (action.condition && !action.condition(row)) return false;
    return true;
  });

  // الحصول على الرابط
  const getHref = (action: ActionConfig): string => {
    if (typeof action.href === 'function') {
      return action.href(row);
    }
    return action.href || '#';
  };

  // الحصول على tooltip
  const getTooltip = (action: ActionConfig): string => {
    if (typeof action.tooltip === 'function') {
      return action.tooltip(row);
    }
    return action.tooltip || action.label || defaultLabels[action.type];
  };

  // فحص إذا كان الزر معطل
  const isDisabled = (action: ActionConfig): boolean => {
    if (action.disabled) {
      return action.disabled(row);
    }
    return false;
  };

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        {visibleActions.map((action, index) => {
          const icon = action.icon || defaultIcons[action.type];
          const color = action.color || defaultColors[action.type];
          const label = action.label || defaultLabels[action.type];
          const tooltip = getTooltip(action);
          const disabled = isDisabled(action);

          // إذا كان هناك رابط
          if (action.href) {
            return (
              <Link
                key={`${action.type}-${index}`}
                href={getHref(action)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled) {
                    e.preventDefault();
                  }
                }}
                className={`rounded-lg transition-colors ${buttonSizes[size]} ${actionColors[color]} ${
                  disabled ? 'pointer-events-none opacity-50' : ''
                }`}
                title={tooltip}
              >
                <span className={iconSizes[size]}>{icon}</span>
                {showLabels && <span className="mr-1 text-xs">{label}</span>}
              </Link>
            );
          }

          // زر عادي
          return (
            <button
              key={`${action.type}-${index}`}
              onClick={(e) => {
                e.stopPropagation();
                executeAction(action);
              }}
              disabled={disabled || loading}
              className={`rounded-lg transition-colors ${buttonSizes[size]} ${actionColors[color]} disabled:cursor-not-allowed disabled:opacity-50`}
              title={tooltip}
            >
              <span className={iconSizes[size]}>{icon}</span>
              {showLabels && <span className="mr-1 text-xs">{label}</span>}
            </button>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmModal.isOpen}
        title={
          confirmModal.action?.confirmTitle ||
          defaultConfirmMessages[confirmModal.action?.type || 'delete'].title
        }
        message={
          confirmModal.action?.confirmMessage ||
          defaultConfirmMessages[confirmModal.action?.type || 'delete'].message
        }
        variant={
          ['delete', 'ban', 'reject', 'suspend'].includes(confirmModal.action?.type || '')
            ? 'danger'
            : 'primary'
        }
        loading={loading}
        onConfirm={confirmAndExecute}
        onCancel={() => setConfirmModal({ isOpen: false, action: null })}
      />
    </>
  );
}

/**
 * إجراءات جاهزة للاستخدام السريع
 * Ready-to-use action presets
 */
export const ActionPresets = {
  // إجراءات المستخدمين
  users: (handlers: {
    onView?: (row: any) => void;
    onEdit?: (row: any) => void;
    onBan?: (row: any) => void;
    onDelete?: (row: any) => void;
    viewHref?: (row: any) => string;
    editHref?: (row: any) => string;
  }): ActionConfig[] => [
    {
      type: 'view',
      href: handlers.viewHref || ((row) => `/admin/users/${row.id}`),
    },
    {
      type: 'edit',
      href: handlers.editHref || ((row) => `/admin/users/${row.id}/edit`),
    },
    {
      type: 'ban',
      onClick: handlers.onBan,
      confirm: true,
      tooltip: (row) => (row.status === 'BLOCKED' ? 'إلغاء الحظر' : 'حظر'),
      color: 'amber',
    },
    {
      type: 'delete',
      onClick: handlers.onDelete,
      confirm: true,
    },
  ],

  // إجراءات المزادات
  auctions: (handlers: {
    onView?: (row: any) => void;
    onEdit?: (row: any) => void;
    onBan?: (row: any) => void;
    onDelete?: (row: any) => void;
    viewHref?: (row: any) => string;
    editHref?: (row: any) => string;
  }): ActionConfig[] => [
    {
      type: 'view',
      href: handlers.viewHref || ((row) => `/admin/auctions/${row.id}`),
    },
    {
      type: 'edit',
      href: handlers.editHref || ((row) => `/admin/auctions/${row.id}/edit`),
    },
    {
      type: 'ban',
      onClick: handlers.onBan,
      confirm: true,
      confirmTitle: 'تأكيد إيقاف المزاد',
      confirmMessage: 'هل أنت متأكد من إيقاف هذا المزاد؟',
      label: 'إيقاف',
      tooltip: 'إيقاف المزاد',
      condition: (row) => row.status === 'ACTIVE',
    },
    {
      type: 'delete',
      onClick: handlers.onDelete,
      confirm: true,
    },
  ],

  // إجراءات المديرين
  admins: (handlers: {
    onView?: (row: any) => void;
    onEdit?: (row: any) => void;
    onActivate?: (row: any) => void;
    onSuspend?: (row: any) => void;
    onDelete?: (row: any) => void;
    viewHref?: (row: any) => string;
    editHref?: (row: any) => string;
  }): ActionConfig[] => [
    {
      type: 'view',
      href: handlers.viewHref || ((row) => `/admin/admins/${row.id}`),
    },
    {
      type: 'edit',
      href: handlers.editHref || ((row) => `/admin/admins/${row.id}/edit`),
    },
    {
      type: 'activate',
      onClick: handlers.onActivate,
      confirm: true,
      condition: (row) => row.status !== 'ACTIVE',
    },
    {
      type: 'suspend',
      onClick: handlers.onSuspend,
      confirm: true,
      condition: (row) => row.status === 'ACTIVE',
      tooltip: (row) => (row.status === 'ACTIVE' ? 'تعليق' : 'إلغاء التعليق'),
      color: 'yellow',
    },
    {
      type: 'delete',
      onClick: handlers.onDelete,
      confirm: true,
      disabled: (row) => row.role === 'SUPER_ADMIN' || row.role === 'super_admin',
    },
  ],

  // إجراءات خدمات النقل
  transport: (handlers: {
    onView?: (row: any) => void;
    onEdit?: (row: any) => void;
    onActivate?: (row: any) => void;
    onSuspend?: (row: any) => void;
    onDelete?: (row: any) => void;
    viewHref?: (row: any) => string;
    editHref?: (row: any) => string;
  }): ActionConfig[] => [
    {
      type: 'view',
      href: handlers.viewHref || ((row) => `/admin/transport/${row.id}`),
    },
    {
      type: 'edit',
      href: handlers.editHref || ((row) => `/admin/transport/${row.id}/edit`),
    },
    {
      type: 'activate',
      onClick: handlers.onActivate,
      confirm: true,
      condition: (row) => row.status !== 'ACTIVE',
    },
    {
      type: 'suspend',
      onClick: handlers.onSuspend,
      confirm: true,
      condition: (row) => row.status === 'ACTIVE',
    },
    {
      type: 'delete',
      onClick: handlers.onDelete,
      confirm: true,
    },
  ],

  // إجراءات المحافظ
  wallets: (handlers: {
    onView?: (row: any) => void;
    onSuspend?: (row: any) => void;
    viewHref?: (row: any) => string;
  }): ActionConfig[] => [
    {
      type: 'view',
      href: handlers.viewHref || ((row) => `/admin/wallets/${row.id}`),
    },
    {
      type: 'suspend',
      onClick: handlers.onSuspend,
      confirm: true,
      confirmTitle: 'تجميد المحفظة',
      confirmMessage: 'هل أنت متأكد من تجميد هذه المحفظة؟',
      label: 'تجميد',
    },
  ],

  // إجراءات المعارض
  showrooms: (handlers: {
    onView?: (row: any) => void;
    onEdit?: (row: any) => void;
    onVerify?: (row: any) => void;
    onSuspend?: (row: any) => void;
    onDelete?: (row: any) => void;
    viewHref?: (row: any) => string;
    editHref?: (row: any) => string;
  }): ActionConfig[] => [
    {
      type: 'view',
      href: handlers.viewHref || ((row) => `/admin/showrooms/${row.id}`),
    },
    {
      type: 'edit',
      href: handlers.editHref || ((row) => `/admin/showrooms/${row.id}/edit`),
    },
    {
      type: 'verify',
      onClick: handlers.onVerify,
      confirm: true,
      condition: (row) => !row.verified,
    },
    {
      type: 'suspend',
      onClick: handlers.onSuspend,
      confirm: true,
      condition: (row) => row.status === 'ACTIVE',
    },
    {
      type: 'delete',
      onClick: handlers.onDelete,
      confirm: true,
    },
  ],

  // إجراءات أساسية (عرض، تعديل، حذف)
  basic: (handlers: {
    onView?: (row: any) => void;
    onEdit?: (row: any) => void;
    onDelete?: (row: any) => void;
    viewHref?: (row: any) => string;
    editHref?: (row: any) => string;
  }): ActionConfig[] => [
    {
      type: 'view',
      href: handlers.viewHref,
      onClick: handlers.onView,
    },
    {
      type: 'edit',
      href: handlers.editHref,
      onClick: handlers.onEdit,
    },
    {
      type: 'delete',
      onClick: handlers.onDelete,
      confirm: true,
    },
  ],

  // إجراءات كاملة
  full: (handlers: {
    onView?: (row: any) => void;
    onEdit?: (row: any) => void;
    onBan?: (row: any) => void;
    onSuspend?: (row: any) => void;
    onDelete?: (row: any) => void;
    viewHref?: (row: any) => string;
    editHref?: (row: any) => string;
  }): ActionConfig[] => [
    {
      type: 'view',
      href: handlers.viewHref,
      onClick: handlers.onView,
    },
    {
      type: 'edit',
      href: handlers.editHref,
      onClick: handlers.onEdit,
    },
    {
      type: 'ban',
      onClick: handlers.onBan,
      confirm: true,
    },
    {
      type: 'suspend',
      onClick: handlers.onSuspend,
      confirm: true,
    },
    {
      type: 'delete',
      onClick: handlers.onDelete,
      confirm: true,
    },
  ],
};

/**
 * تصدير الأنواع والثوابت
 */
export { actionColors, defaultColors, defaultConfirmMessages, defaultIcons, defaultLabels };
