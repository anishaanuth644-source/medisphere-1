// src/components/DataTable.jsx
//
// Generic table wrapper with pagination, loading skeletons, empty states,
// and an optional CSV download button. Uses render-prop pattern for rows
// so each page controls its own cell content.

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Skeleton, EmptyState } from "./ui/index";
import { downloadCSV } from "../utils/exportUtils";

export function DataTable({
  columns,          // array of column header strings
  rows,             // filtered/sorted array of data items
  renderRow,        // (item) => <tr key=...>
  loading = false,
  emptyIcon,
  emptyTitle = "No records found",
  emptySubtitle,
  pageSize = 10,
  exportRows,       // optional: () => array of plain objects for CSV
  exportFilename = "export.csv",
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice(page * pageSize, page * pageSize + pageSize);

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-4 py-3 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {visible.map(renderRow)}
          </tbody>
        </table>
      </div>

      {/* Pagination + export footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {page * pageSize + 1}–{Math.min(rows.length, page * pageSize + pageSize)} of {rows.length}
          </span>
          {exportRows && (
            <button
              onClick={() => downloadCSV(exportRows(), exportFilename)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-600 transition-colors"
            >
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-slate-500 px-2">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
