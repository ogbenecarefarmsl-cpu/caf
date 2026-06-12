import { type ReactNode } from 'react';
import { type PaginationMeta } from '../../hooks/usePagination';
import { Pagination } from './Pagination';

export interface TableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  emptyMessage?: string;
  isLoading?: boolean;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSort?: (key: string) => void;
  currentSort?: { key: string; order: 'asc' | 'desc' };
  rowKey?: (item: T) => string;
  onRowClick?: (item: T) => void;
}

export const Table = <T extends Record<string, any>>({
  data,
  columns,
  emptyMessage = 'No data available',
  isLoading = false,
  pagination,
  onPageChange,
  onLimitChange,
  onSort,
  currentSort,
  rowKey = (item) => item._id ?? item.id ?? 'unknown',
  onRowClick,
}: TableProps<T>) => {
  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-primary-dark rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="bg-primary-dark rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-dark rounded-xl border border-gray-700 overflow-hidden">
      <div className="relative">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-primary-darker">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:text-white' : ''
                  } ${column.className || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="ml-2">
                        {currentSort?.key === column.key ? (
                          currentSort.order === 'asc' ? (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          )
                        ) : (
                          <svg
                            className="w-4 h-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                            />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {safeData.map((item) => (
              <tr
                key={rowKey(item)}
                onClick={() => onRowClick?.(item)}
                className={`${
                  onRowClick
                    ? 'cursor-pointer hover:bg-gray-800 transition-colors'
                    : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-3 sm:px-6 sm:py-4 text-sm ${
                      column.className || ''
                    }`}
                  >
                    {column.render
                      ? column.render(item)
                      : item[column.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 sm:hidden pointer-events-none">
          <div className="w-8 h-full bg-gradient-to-l from-primary-dark to-transparent flex items-center justify-end">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && (
        <Pagination
          meta={pagination}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
    </div>
  );
};
