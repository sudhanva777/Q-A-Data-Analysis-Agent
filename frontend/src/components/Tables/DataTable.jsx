import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Table as TableIcon } from 'lucide-react';

export default function DataTable({ data, title = 'Supporting Data' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  if (!data || !data.columns || !data.rows) {
    return (
      <div className="p-4 text-[13px] text-gray-500 italic bg-gray-50 rounded-lg">
        No tabular data returned for this query.
      </div>
    );
  }

  const columns = data.columns;
  const rows = data.rows;

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [rows, columns, searchQuery]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (!rows.length) return;
    const headerStr = columns.join(',');
    const rowStrs = rows.map((r) =>
      columns
        .map((c) => {
          let val = r[c] === null || r[c] === undefined ? '' : String(r[c]);
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerStr, ...rowStrs].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <TableIcon className="w-4 h-4 text-gray-500" />
          <span className="text-[13.5px] font-semibold text-gray-800">{title}</span>
          <span className="text-[12px] text-gray-500 font-normal">
            ({filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1 text-[12.5px] bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 w-44 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Download CSV */}
          <button
            onClick={handleExportCSV}
            title="Download CSV"
            className="inline-flex items-center px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 text-[12.5px] font-medium border border-gray-300 rounded-md transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV
          </button>
        </div>
      </div>

      {/* Table Scrollable Container */}
      <div className="overflow-x-auto max-h-[380px]">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0 border-b border-gray-200 z-10">
            <tr>
              <th className="py-2.5 px-3.5 w-12 text-center text-gray-400 font-mono text-[11px]">#</th>
              {columns.map((col, idx) => (
                <th key={idx} className="py-2.5 px-3.5 font-semibold text-gray-800 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800 font-normal">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-6 text-center text-gray-400 italic">
                  No matching data rows found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => {
                const globalRowIdx = (currentPage - 1) * pageSize + rIdx + 1;
                return (
                  <tr
                    key={rIdx}
                    className="hover:bg-blue-50/40 transition-colors odd:bg-white even:bg-slate-50/60"
                  >
                    <td className="py-2 px-3.5 text-center text-gray-400 font-mono text-[11.5px]">
                      {globalRowIdx}
                    </td>
                    {columns.map((col, cIdx) => {
                      const val = row[col];
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={cIdx}
                          className={`py-2 px-3.5 whitespace-nowrap ${
                            isNum ? 'font-mono text-slate-900' : 'text-gray-800'
                          }`}
                        >
                          {val === null || val === undefined ? (
                            <span className="text-gray-300 italic">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-2.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-[12.5px] text-gray-600">
          <span>
            Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalPages}</span>
          </span>

          <div className="flex items-center space-x-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
