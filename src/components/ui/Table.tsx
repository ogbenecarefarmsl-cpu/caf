import { type ReactNode, useEffect, useState } from "react";
import * as React from "react";
import { type PaginationMeta } from "../../hooks/usePagination";
import { Pagination } from "./Pagination";

export interface TableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
  /** Show this column in mobile card view (defaults to true for first 3 columns) */
  mobileVisible?: boolean;
  /** Make this the primary field in mobile cards */
  mobilePrimary?: boolean;
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
  currentSort?: { key: string; order: "asc" | "desc" };
  rowKey?: (item: T) => string;
  onRowClick?: (item: T) => void;
  /** Enable mobile card view (defaults to true) */
  mobileCardView?: boolean;
}

export const Table = <T extends Record<string, any>>({
  data,
  columns,
  emptyMessage = "No data available",
  isLoading = false,
  pagination,
  onPageChange,
  onLimitChange,
  onSort,
  currentSort,
  rowKey = (item) => item._id ?? item.id ?? "unknown",
  onRowClick,
  mobileCardView = true,
}: TableProps<T>) => {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
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

  // Determine which columns to show in mobile
  const mobileColumns = columns.filter(
    (col, idx) =>
      col.mobileVisible !== false && (col.mobileVisible === true || idx < 3),
  );
  const primaryColumn = columns.find((col) => col.mobilePrimary) || columns[0];

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

  // Mobile card view
  if (isMobile && mobileCardView) {
    return (
      <div className="bg-primary-dark rounded-xl border border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-700">
          {safeData.map((item) => (
            <div
              key={rowKey(item)}
              onClick={() => onRowClick?.(item)}
              className={`p-4 ${
                onRowClick
                  ? "cursor-pointer hover:bg-gray-800 active:bg-gray-750 transition-colors"
                  : ""
              }`}
            >
              {/* Primary field - larger and bold */}
              {primaryColumn && (
                <div className="mb-2">
                  <div className="text-base font-semibold text-white">
                    {primaryColumn.render
                      ? primaryColumn.render(item)
                      : (item[primaryColumn.key] ?? "-")}
                  </div>
                </div>
              )}

              {/* Other visible fields - smaller, two columns on wider mobile */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {mobileColumns
                  .filter((col) => col.key !== primaryColumn?.key)
                  .map((column) => (
                    <div key={column.key} className="min-w-0">
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                        {column.header}
                      </div>
                      <div className="text-sm text-gray-200 truncate">
                        {column.render
                          ? column.render(item)
                          : (item[column.key] ?? "-")}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
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
  }

  // Desktop table view
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
                      column.sortable ? "cursor-pointer hover:text-white" : ""
                    } ${column.className || ""}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {column.sortable && (
                        <span className="ml-2">
                          {currentSort?.key === column.key ? (
                            currentSort.order === "asc" ? (
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
                      ? "cursor-pointer hover:bg-gray-800 transition-colors"
                      : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-3 sm:px-6 sm:py-4 text-sm ${
                        column.className || ""
                      }`}
                    >
                      {column.render
                        ? column.render(item)
                        : (item[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 sm:hidden pointer-events-none">
          <div className="w-8 h-full bg-gradient-to-l from-primary-dark to-transparent flex items-center justify-end">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
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
