import { useState, useMemo } from "react";

export function useFilters(items, { searchFields = [], defaultSort = null } = {}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState(defaultSort);

  const filtered = useMemo(() => {
    let result = items || [];

    // Search
    if (search && searchFields.length > 0) {
      const term = search.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const val = item[field];
          return val && String(val).toLowerCase().includes(term);
        })
      );
    }

    // Filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "All") {
        result = result.filter(item => item[key] === value);
      }
    });

    // Sort
    if (sort && sort.field) {
      result = [...result].sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sort.dir === "desc" ? -cmp : cmp;
      });
    }

    return result;
  }, [items, search, filters, sort, searchFields]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const toggleSort = (field) => setSort(prev =>
    prev?.field === field
      ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { field, dir: "asc" }
  );

  return { filtered, search, setSearch, filters, setFilter, sort, setSort, toggleSort };
}
