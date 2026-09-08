import { useEffect, useRef, useState } from 'react';

import { useDebounce } from './use-debounce.hook';

export interface IUseListQueryParams<TFilters extends Record<string, unknown>> {
  page: number;
  setPage: (page: number) => void;
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  debouncedFilters: TFilters;
}

export function useListQueryParams<TFilters extends Record<string, unknown>>(
  initialFilters: TFilters,
  debounceMs = 400,
): IUseListQueryParams<TFilters> {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const debouncedFilters = useDebounce(filters, debounceMs);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      return;
    }

    setPage(1);
  }, [debouncedFilters]);

  function setFilter<K extends keyof TFilters>(key: K, value: TFilters[K]): void {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  return { page, setPage, filters, setFilter, debouncedFilters };
}
