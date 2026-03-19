import { useState, useMemo } from "react";

export function usePagination(items, pageSize = 25) {
  const [page, setPage] = useState(0);

  const totalPages = useMemo(() => Math.ceil((items?.length || 0) / pageSize), [items, pageSize]);
  const pageItems = useMemo(() => (items || []).slice(page * pageSize, (page + 1) * pageSize), [items, page, pageSize]);

  // Reset to page 0 when items change significantly
  const total = items?.length || 0;

  return {
    page,
    pageItems,
    totalPages,
    total,
    next: () => setPage(p => Math.min(p + 1, totalPages - 1)),
    prev: () => setPage(p => Math.max(p - 1, 0)),
    goTo: setPage,
    hasNext: page < totalPages - 1,
    hasPrev: page > 0,
  };
}
