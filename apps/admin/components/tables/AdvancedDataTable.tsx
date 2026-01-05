/**
 * جدول البيانات المتقدم - Enterprise Advanced Data Table
 * مكون موحد للجداول مع أزرار الإجراءات (حذف، تعديل، تجميد، حظر)
 */
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  EyeIcon,
  NoSymbolIcon,
  PauseIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import React, { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';

// أنواع الإجراءات المتاحة
export type ActionType =
  | 'view'
  | 'edit'
  | 'delete'
  | 'suspend'
  | 'ban'
  | 'approve'
  | 'reject'
  | 'custom';

export interface TableAction {
  type: ActionType;
  label?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';
  onClick?: (row: any) => void;
  href?: (row: any) => string;
  confirm?: boolean;
  confirmMessage?: string;
  condition?: (row: any) => boolean;
}

export interface TableColumn {
  id: string;
  header: string;
  accessor: string | ((row: any) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'right' | 'center' | 'left';
  render?: (value: any, row: any) => React.ReactNode;
}

export interface AdvancedDataTableProps {
  columns: TableColumn[];
  data: any[];
  actions?: TableAction[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  selectable?: boolean;
  onSelectionChange?: (selected: any[]) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  stickyHeader?: boolean;
  compact?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  rowKey?: string;
  onRowClick?: (row: any) => void;
  bulkActions?: TableAction[];
}

// ألوان الإجراءات
const actionColors = {
  blue: 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10',
  green: 'text-green-400 hover:text-green-300 hover:bg-green-500/10',
  yellow: 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10',
  red: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
  gray: 'text-slate-400 hover:text-slate-300 hover:bg-slate-500/10',
  purple: 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10',
};

// أيقونات الإجراءات الافتراضية
const defaultActionIcons: Record<ActionType, React.ReactNode> = {
  view: <EyeIcon className="h-5 w-5" />,
  edit: <PencilSquareIcon className="h-5 w-5" />,
  delete: <TrashIcon className="h-5 w-5" />,
  suspend: <PauseIcon className="h-5 w-5" />,
  ban: <NoSymbolIcon className="h-5 w-5" />,
  approve: <CheckIcon className="h-5 w-5" />,
  reject: <XMarkIcon className="h-5 w-5" />,
  custom: null,
};

// ألوان الإجراءات الافتراضية
const defaultActionColors: Record<ActionType, keyof typeof actionColors> = {
  view: 'blue',
  edit: 'yellow',
  delete: 'red',
  suspend: 'yellow',
  ban: 'red',
  approve: 'green',
  reject: 'red',
  custom: 'gray',
};

// تسميات الإجراءات الافتراضية
const defaultActionLabels: Record<ActionType, string> = {
  view: 'عرض',
  edit: 'تعديل',
  delete: 'حذف',
  suspend: 'تجميد',
  ban: 'حظر',
  approve: 'موافقة',
  reject: 'رفض',
  custom: '',
};

export default function AdvancedDataTable({
  columns,
  data,
  actions = [],
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  emptyIcon,
  selectable = false,
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
  stickyHeader = true,
  compact = false,
  striped = true,
  hoverable = true,
  bordered = false,
  rowKey = 'id',
  onRowClick,
  bulkActions = [],
}: AdvancedDataTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{
    action: TableAction;
    row: any;
  } | null>(null);

  // التعامل مع الاختيار
  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(data.map((row) => row[rowKey]));
      setSelectedRows(allIds);
      onSelectionChange?.(data);
    }
  };

  const handleSelectRow = (row: any) => {
    const id = row[rowKey];
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(data.filter((r) => newSelected.has(r[rowKey])));
  };

  // التعامل مع الترتيب
  const handleSort = (field: string) => {
    if (!onSort) return;
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  };

  // تنفيذ الإجراء
  const executeAction = (action: TableAction, row: any) => {
    if (action.confirm) {
      setConfirmAction({ action, row });
    } else {
      action.onClick?.(row);
    }
  };

  // تأكيد الإجراء
  const confirmActionExecution = () => {
    if (confirmAction) {
      confirmAction.action.onClick?.(confirmAction.row);
      setConfirmAction(null);
    }
  };

  // الحصول على قيمة الخلية
  const getCellValue = (row: any, column: TableColumn) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    const keys = column.accessor.split('.');
    let value = row;
    for (const key of keys) {
      value = value?.[key];
    }
    return column.render ? column.render(value, row) : value;
  };

  // أنماط الجدول
  const tableClasses = `w-full ${bordered ? 'border border-slate-700' : ''}`;
  const headerClasses = `bg-slate-800/80 text-slate-300 ${stickyHeader ? 'sticky top-0 z-10' : ''}`;
  const rowClasses = `
    ${striped ? 'even:bg-slate-800/30' : ''}
    ${hoverable ? 'hover:bg-slate-700/50 transition-colors' : ''}
    ${onRowClick ? 'cursor-pointer' : ''}
  `;
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        {emptyIcon || (
          <div className="mb-4 rounded-full bg-slate-800 p-4">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
        )}
        <p className="text-lg font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* شريط الإجراءات الجماعية */}
      {selectable && selectedRows.size > 0 && bulkActions.length > 0 && (
        <div className="mb-4 flex items-center gap-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <span className="text-sm text-blue-300">تم تحديد {selectedRows.size} عنصر</span>
          <div className="flex gap-2">
            {bulkActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  const selectedData = data.filter((r) => selectedRows.has(r[rowKey]));
                  action.onClick?.(selectedData);
                }}
                className={`flex items-center gap-1 rounded px-3 py-1 text-sm ${
                  actionColors[action.color || defaultActionColors[action.type]]
                }`}
              >
                {action.icon || defaultActionIcons[action.type]}
                <span>{action.label || defaultActionLabels[action.type]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الجدول */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className={tableClasses}>
          <thead className={headerClasses}>
            <tr>
              {/* خانة الاختيار */}
              {selectable && (
                <th className={`${cellPadding} w-10`}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                  />
                </th>
              )}

              {/* الأعمدة */}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`${cellPadding} text-${column.align || 'right'} font-medium ${
                    column.sortable ? 'cursor-pointer select-none' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div
                    className={`flex items-center gap-2 ${column.align === 'left' ? 'flex-row-reverse' : ''}`}
                  >
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="text-slate-500">
                        {sortField === column.id ? (
                          sortDirection === 'asc' ? (
                            <ArrowUpIcon className="h-4 w-4" />
                          ) : (
                            <ArrowDownIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowsUpDownIcon className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}

              {/* عمود الإجراءات */}
              {actions.length > 0 && (
                <th className={`${cellPadding} w-32 text-center font-medium`}>الإجراءات</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {data.map((row, rowIndex) => (
              <tr
                key={row[rowKey] || rowIndex}
                className={rowClasses}
                onClick={() => onRowClick?.(row)}
              >
                {/* خانة الاختيار */}
                {selectable && (
                  <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row[rowKey])}
                      onChange={() => handleSelectRow(row)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                  </td>
                )}

                {/* الخلايا */}
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`${cellPadding} text-${column.align || 'right'} text-slate-300`}
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}

                {/* الإجراءات */}
                {actions.length > 0 && (
                  <td className={`${cellPadding} text-center`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {actions
                        .filter((action) => !action.condition || action.condition(row))
                        .map((action, actionIndex) => {
                          const color = action.color || defaultActionColors[action.type];
                          const icon = action.icon || defaultActionIcons[action.type];
                          const label = action.label || defaultActionLabels[action.type];

                          if (action.href) {
                            return (
                              <Link
                                key={actionIndex}
                                href={action.href(row)}
                                className={`rounded p-1.5 transition-colors ${actionColors[color]}`}
                                title={label}
                              >
                                {icon}
                              </Link>
                            );
                          }

                          return (
                            <button
                              key={actionIndex}
                              onClick={() => executeAction(action, row)}
                              className={`rounded p-1.5 transition-colors ${actionColors[color]}`}
                              title={label}
                            >
                              {icon}
                            </button>
                          );
                        })}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title="تأكيد الإجراء"
        message={
          confirmAction?.action.confirmMessage ||
          `هل أنت متأكد من ${
            defaultActionLabels[confirmAction?.action.type || 'delete']
          }؟`
        }
        variant={
          confirmAction &&
          (confirmAction.action.type === 'delete' || confirmAction.action.type === 'ban')
            ? 'danger'
            : 'primary'
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmActionExecution}
      />
    </>
  );
}
