import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  updateURL?: boolean;
  pageParam?: string;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

interface PaginationActions {
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setItemsPerPage: (items: number) => void;
  setTotalItems: (total: number) => void;
  reset: () => void;
}

export interface UsePaginationReturn extends PaginationState, PaginationActions { }

export const usePagination = ({
  initialPage = 1,
  itemsPerPage = 20,
  totalItems = 0,
  updateURL = false,
  pageParam = 'page',
}: UsePaginationOptions = {}): UsePaginationReturn => {
  const router = useRouter();

  // استخراج الصفحة الحالية من URL إذا كان مطلوباً
  const getInitialPage = () => {
    if (updateURL && router.query[pageParam]) {
      const pageFromURL = parseInt(router.query[pageParam] as string, 10);
      return isNaN(pageFromURL) || pageFromURL < 1 ? initialPage : pageFromURL;
    }
    return initialPage;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage);
  const [currentTotalItems, setCurrentTotalItems] = useState(totalItems);

  // تحديث الصفحة الحالية عند تغيير URL
  useEffect(() => {
    if (updateURL && router.query[pageParam]) {
      const pageFromURL = parseInt(router.query[pageParam] as string, 10);
      if (!isNaN(pageFromURL) && pageFromURL > 0) {
        setCurrentPage((prev) => (prev === pageFromURL ? prev : pageFromURL));
      }
    }
  }, [router.query, pageParam, updateURL]);

  // حساب القيم المشتقة
  const paginationState = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(currentTotalItems / currentItemsPerPage));
    const safePage = Math.max(1, Math.min(currentPage, totalPages));
    const startIndex = (safePage - 1) * currentItemsPerPage;
    const endIndex = Math.min(startIndex + currentItemsPerPage - 1, currentTotalItems - 1);

    return {
      currentPage: safePage,
      itemsPerPage: currentItemsPerPage,
      totalPages,
      totalItems: currentTotalItems,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
      startIndex,
      endIndex,
    };
  }, [currentPage, currentItemsPerPage, currentTotalItems]);

  // دالة تغيير الصفحة
  const setPage = useCallback(
    (page: number) => {
      const newPage = Math.max(1, Math.min(page, paginationState.totalPages));
      setCurrentPage((prev) => (prev === newPage ? prev : newPage));

      if (updateURL) {
        const query = { ...router.query };
        if (newPage === 1) {
          delete query[pageParam];
        } else {
          query[pageParam] = newPage.toString();
        }

        const currentParam = router.query[pageParam];
        const currentValue = Array.isArray(currentParam) ? currentParam[0] : currentParam;
        const desiredValue = newPage === 1 ? undefined : newPage.toString();
        const isSame = desiredValue === undefined ? currentValue === undefined : currentValue === desiredValue;

        if (!isSame) {
          router.replace(
            {
              pathname: router.pathname,
              query,
            },
            undefined,
            { shallow: true },
          );
        }
      }
    },
    [paginationState.totalPages, pageParam, router, updateURL],
  );

  // دالة الانتقال للصفحة التالية
  const nextPage = useCallback(() => {
    if (paginationState.hasNextPage) {
      setPage(currentPage + 1);
    }
  }, [paginationState.hasNextPage, setPage, currentPage]);

  // دالة الانتقال للصفحة السابقة
  const prevPage = useCallback(() => {
    if (paginationState.hasPrevPage) {
      setPage(currentPage - 1);
    }
  }, [paginationState.hasPrevPage, setPage, currentPage]);

  // دالة تغيير عدد العناصر في الصفحة
  const setItemsPerPage = useCallback(
    (items: number) => {
      const newItemsPerPage = Math.max(1, items);
      setCurrentItemsPerPage((prev) => (prev === newItemsPerPage ? prev : newItemsPerPage));

      // إعادة حساب الصفحة الحالية للحفاظ على نفس العنصر الأول تقريباً
      const currentFirstItem = (currentPage - 1) * currentItemsPerPage;
      const newPage = Math.max(1, Math.ceil((currentFirstItem + 1) / newItemsPerPage));
      setPage(newPage);
    },
    [setPage, currentItemsPerPage, currentPage],
  );

  // دالة تحديث العدد الإجمالي للعناصر
  const setTotalItems = useCallback(
    (total: number) => {
      const newTotal = Math.max(0, total);
      setCurrentTotalItems((prev) => (prev === newTotal ? prev : newTotal));

      // التأكد من أن الصفحة الحالية لا تزال صالحة
      const newTotalPages = Math.max(1, Math.ceil(newTotal / currentItemsPerPage));
      if (paginationState.currentPage > newTotalPages) {
        setPage(newTotalPages);
      }
    },
    [currentItemsPerPage, paginationState.currentPage, setPage],
  );

  // دالة إعادة التعيين
  const reset = useCallback(() => {
    setCurrentPage((prev) => (prev === initialPage ? prev : initialPage));
    setCurrentItemsPerPage((prev) => (prev === itemsPerPage ? prev : itemsPerPage));
    setCurrentTotalItems((prev) => (prev === totalItems ? prev : totalItems));

    if (updateURL) {
      const query = { ...router.query };
      delete query[pageParam];
      router.replace(
        {
          pathname: router.pathname,
          query,
        },
        undefined,
        { shallow: true },
      );
    }
  }, [initialPage, itemsPerPage, pageParam, router, totalItems, updateURL]);

  return useMemo(
    () => ({
      ...paginationState,
      setPage,
      nextPage,
      prevPage,
      setItemsPerPage,
      setTotalItems,
      reset,
    }),
    [paginationState, nextPage, prevPage, reset, setItemsPerPage, setPage, setTotalItems],
  );
};

// Hook مبسط للاستخدام مع البيانات المحلية
export const useLocalPagination = <T>(
  items: T[],
  itemsPerPage: number = 20,
  initialPage: number = 1,
) => {
  const pagination = usePagination({
    initialPage,
    itemsPerPage,
    totalItems: items.length,
    updateURL: false,
  });

  const paginatedItems = useMemo(() => {
    const start = pagination.startIndex;
    const end = start + pagination.itemsPerPage;
    return items.slice(start, end);
  }, [items, pagination.startIndex, pagination.itemsPerPage]);

  return {
    ...pagination,
    items: paginatedItems,
  };
};

export default usePagination;
