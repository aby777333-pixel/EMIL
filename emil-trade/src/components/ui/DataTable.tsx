'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/format';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  emptyMessage?: string;
  pageSize?: number;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  sortable = false,
  onSort,
  emptyMessage = 'No data available',
  pageSize: initialPageSize = 10,
  loading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  function handleSort(key: string) {
    if (!sortable) return;
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  }

  const sorted = useMemo(() => {
    if (!sortKey || onSort) return data; // External sort or no sort
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null || bVal == null) return 0;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, onSort]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page if data shrinks
  if (page >= totalPages && totalPages > 0) setPage(totalPages - 1);

  // Loading skeleton
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-elevated">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-muted">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, r) => (
              <tr key={r} className="border-b border-border last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-3 w-20 animate-pulse rounded bg-surface" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-elevated">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => {
                const canSort = sortable && col.sortable !== false;
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 font-medium text-muted',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      canSort && 'cursor-pointer select-none transition-colors hover:text-foreground',
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => canSort && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {canSort && (
                        isSorted
                          ? sortDir === 'asc'
                            ? <ChevronUp className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />
                          : <ChevronsUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-secondary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-border transition-colors last:border-0 hover:bg-surface/50',
                    i % 2 === 1 && 'bg-surface/20',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-foreground',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      )}
                    >
                      {col.render
                        ? col.render(row, page * pageSize + i)
                        : (row[col.key] as ReactNode) ?? '\u2014'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="rounded border border-border bg-surface px-1.5 py-0.5 text-foreground"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>
              {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
            </span>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded px-2 py-1 transition-colors hover:bg-surface disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded px-2 py-1 transition-colors hover:bg-surface disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
