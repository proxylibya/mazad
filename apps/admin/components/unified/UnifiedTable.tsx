/**
 * 📊 مكون الجدول الموحد
 * Unified Table Component
 *
 * جدول متقدم مع دعم:
 * - عرض الصور تلقائياً
 * - الفرز والترتيب
 * - الحالات والألوان
 * - التحميل والفراغ
 * - الترقيم
 */

import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import {
  DEFAULT_TABLE_TEXT_MAX_LENGTH,
  formatDate,
  formatNumber,
  formatPhoneNumber,
  formatPrice,
  getStatusClasses,
  getStatusConfig,
  truncateText,
  type ImageableEntity,
  type TableColumn,
} from '../../lib/unified-admin-system';
import UnifiedImage, { UserAvatar } from './UnifiedImage';

interface UnifiedTableProps<T> {
  /** أعمدة الجدول */
  columns: TableColumn<T>[];
  /** البيانات */
  data: T[];
  /** حالة التحميل */
  loading?: boolean;
  /** رسالة عند عدم وجود بيانات */
  emptyMessage?: string;
  /** حدث النقر على الصف */
  onRowClick?: (row: T) => void;
  /** مفتاح فريد لكل صف */
  rowKey?: keyof T | ((row: T) => string);
  /** إظهار خانات الاختيار */
  selectable?: boolean;
  /** الصفوف المحددة */
  selectedRows?: T[];
  /** حدث تغيير التحديد */
  onSelectionChange?: (selected: T[]) => void;
  /** تفعيل الفرز */
  sortable?: boolean;
  /** Class إضافية للجدول */
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export default function UnifiedTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  onRowClick,
  rowKey = 'id' as keyof T,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  sortable = true,
  className = '',
}: UnifiedTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // معالجة الفرز
  const handleSort = (columnId: string) => {
    if (!sortable) return;

    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  // فرز البيانات
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const column = columns.find((c) => c.id === sortColumn);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const accessor = column.accessor;
      const aValue = typeof accessor === 'function' ? accessor(a) : a[accessor];
      const bValue = typeof accessor === 'function' ? accessor(b) : b[accessor];

      let comparison = 0;
      if (aValue === null || aValue === undefined) comparison = 1;
      else if (bValue === null || bValue === undefined) comparison = -1;
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'ar');
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'ar');
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, sortColumn, sortDirection, columns]);

  // الحصول على مفتاح الصف
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(row);
    const key = row[rowKey];
    return key !== undefined && key !== null ? String(key) : `row-${index}`;
  };

  // معالجة تحديد الكل
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.([...data]);
    }
  };

  // معالجة تحديد صف
  const handleSelectRow = (row: T) => {
    const isSelected = selectedRows.some((r) => getRowKey(r, 0) === getRowKey(row, 0));
    if (isSelected) {
      onSelectionChange?.(selectedRows.filter((r) => getRowKey(r, 0) !== getRowKey(row, 0)));
    } else {
      onSelectionChange?.([...selectedRows, row]);
    }
  };

  // عرض قيمة الخلية
  const renderCellValue = (column: TableColumn<T>, row: T): React.ReactNode => {
    const accessor = column.accessor;
    const value = typeof accessor === 'function' ? accessor(row) : row[accessor];

    const shouldTruncate = (() => {
      if (column.truncate === true) return true;
      if (column.truncate === false) return false;
      if (
        column.type &&
        ['image', 'status', 'date', 'price', 'phone', 'badge', 'actions'].includes(column.type)
      ) {
        return false;
      }
      if (typeof accessor === 'string') {
        const key = accessor.toLowerCase();
        return key === 'title' || key === 'name';
      }
      return false;
    })();

    const truncatedValue =
      typeof value === 'string' && shouldTruncate
        ? truncateText(value, column.maxLength ?? DEFAULT_TABLE_TEXT_MAX_LENGTH)
        : value;

    // استخدام render مخصص إذا وجد
    if (column.render) {
      return column.render(truncatedValue, row);
    }

    // عرض حسب نوع العمود
    switch (column.type) {
      case 'image':
        if (column.imageConfig?.fallbackIcon === 'user') {
          return (
            <UserAvatar
              user={row as unknown as { name?: string; profileImage?: string }}
              size={column.imageConfig?.size || 'sm'}
              showName={false}
            />
          );
        }
        const resolvedImageConfig = { ...column.imageConfig };
        if (resolvedImageConfig.showCount === undefined) {
          resolvedImageConfig.showCount = true;
        }
        const rowAny = row as Record<string, unknown>;
        return (
          <UnifiedImage
            src={row as unknown as ImageableEntity}
            config={resolvedImageConfig}
            alt={String(rowAny.title || rowAny.name || 'صورة')}
          />
        );

      case 'status':
        const status = String(value || '');
        const statusConfig = getStatusConfig(status);
        return (
          <span className={`rounded-full border px-2.5 py-1 text-xs ${getStatusClasses(status)}`}>
            {statusConfig.label}
          </span>
        );

      case 'date':
        return <span className="text-slate-300">{formatDate(value as string | Date)}</span>;

      case 'price':
        return <span className="font-medium text-emerald-400">{formatPrice(value as number)}</span>;

      case 'phone':
        return (
          <span className="text-slate-300" dir="ltr">
            {formatPhoneNumber(String(value || ''))}
          </span>
        );

      case 'badge':
        return (
          <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-400">
            {String(value || '')}
          </span>
        );

      default:
        if (typeof value === 'number') {
          return <span className="text-slate-300">{formatNumber(value)}</span>;
        }
        if (typeof value === 'string' && shouldTruncate) {
          const maxLength = column.maxLength ?? DEFAULT_TABLE_TEXT_MAX_LENGTH;
          return (
            <span className="text-slate-300" title={value}>
              {truncateText(value, maxLength)}
            </span>
          );
        }
        return <span className="text-slate-300">{String(value ?? '-')}</span>;
    }
  };

  // حالة التحميل
  if (loading) {
    return (
      <div
        className={`overflow-hidden rounded-xl border border-slate-700 bg-slate-800 ${className}`}
      >
        <div className="p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="mt-2 text-slate-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // حالة الفراغ
  if (data.length === 0) {
    return (
      <div
        className={`overflow-hidden rounded-xl border border-slate-700 bg-slate-800 ${className}`}
      >
        <div className="p-8 text-center">
          <InboxIcon className="mx-auto h-16 w-16 text-slate-600" />
          <p className="mt-4 text-slate-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-700 bg-slate-800 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              {/* Checkbox column */}
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`whitespace-nowrap px-6 py-3 text-right text-sm font-semibold text-slate-300 ${
                    sortable && column.sortable !== false
                      ? 'cursor-pointer select-none hover:bg-slate-700/50'
                      : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{column.header}</span>
                    {sortable && column.sortable !== false && (
                      <span className="text-slate-500">
                        {sortColumn === column.id ? (
                          sortDirection === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUpDownIcon className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-700">
            {sortedData.map((row, index) => {
              const key = getRowKey(row, index);
              const isSelected = selectedRows.some((r) => getRowKey(r, 0) === key);

              return (
                <tr
                  key={key}
                  className={`transition-colors ${
                    isSelected ? 'bg-blue-500/10' : 'hover:bg-slate-700/30'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {/* Checkbox */}
                  {selectable && (
                    <td className="w-12 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(row)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                      />
                    </td>
                  )}

                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={`whitespace-nowrap px-6 py-4 ${
                        column.align === 'center'
                          ? 'text-center'
                          : column.align === 'left'
                            ? 'text-left'
                            : 'text-right'
                      }`}
                    >
                      {renderCellValue(column, row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ================== أنواع الأعمدة الجاهزة ==================

export const ColumnPresets = {
  /** عمود صورة المستخدم مع الاسم */
  userWithImage: <T extends { name?: string; profileImage?: string }>(
    header = 'المستخدم',
  ): TableColumn<T> => ({
    id: 'user',
    header,
    accessor: 'name' as keyof T,
    type: 'custom',
    render: (value, row) => (
      <div className="flex items-center gap-3">
        <UnifiedImage
          src={row as unknown as ImageableEntity}
          alt={String(row.name || 'مستخدم')}
          config={{ fallbackIcon: 'user', size: 'sm', rounded: 'full' }}
        />
        <div>
          <p className="font-medium text-white" title={String(row.name || '')}>
            {String(value || row.name || 'بدون اسم')}
          </p>
        </div>
      </div>
    ),
  }),

  /** عمود صورة المنتج مع العنوان */
  productWithImage: <T extends ImageableEntity & { title?: string; name?: string }>(
    header = 'المنتج',
  ): TableColumn<T> => ({
    id: 'product',
    header,
    accessor: 'title' as keyof T,
    type: 'custom',
    render: (value, row) => (
      <div className="flex items-center gap-3">
        <UnifiedImage
          src={row as unknown as ImageableEntity}
          alt={String(row.title || row.name || 'منتج')}
          config={{ size: 'sm', rounded: 'lg', fallbackIcon: 'car', showCount: true }}
        />
        <div>
          <p className="font-medium text-white" title={String(row.title || '')}>
            {String(value || row.title || row.name || 'بدون عنوان')}
          </p>
        </div>
      </div>
    ),
  }),

  /** عمود الصور فقط */
  images: <T extends ImageableEntity>(header = 'الصورة'): TableColumn<T> => ({
    id: 'images',
    header,
    accessor: 'images' as keyof T,
    type: 'image',
    imageConfig: { size: 'sm', rounded: 'lg', showCount: true },
  }),

  /** عمود الحالة */
  status: <T extends { status: string }>(header = 'الحالة'): TableColumn<T> => ({
    id: 'status',
    header,
    accessor: 'status' as keyof T,
    type: 'status',
  }),

  /** عمود التاريخ */
  date: <T,>(accessor: keyof T, header = 'التاريخ'): TableColumn<T> => ({
    id: String(accessor),
    header,
    accessor,
    type: 'date',
  }),

  /** عمود السعر */
  price: <T,>(accessor: keyof T, header = 'السعر'): TableColumn<T> => ({
    id: String(accessor),
    header,
    accessor,
    type: 'price',
  }),

  /** عمود الهاتف */
  phone: <T,>(accessor: keyof T = 'phone' as keyof T, header = 'رقم الهاتف'): TableColumn<T> => ({
    id: String(accessor),
    header,
    accessor,
    type: 'phone',
  }),
};
