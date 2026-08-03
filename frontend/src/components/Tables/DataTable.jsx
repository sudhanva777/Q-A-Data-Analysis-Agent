import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Table as TableIcon } from 'lucide-react';

export default function DataTable({ data, title = 'Supporting Data' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const rawColumns = data?.columns;
  const rawRows = data?.rows;

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!rawRows || !rawRows.length) return [];
    if (!searchQuery.trim()) return rawRows;
    const q = searchQuery.toLowerCase();
    const cols = rawColumns || [];
    return rawRows.filter((row) =>
      cols.some((col) => {
        const val = row[col];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [rawRows, rawColumns, searchQuery]);


  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    if (!filteredRows.length) return [];
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  if (!data || !data.columns || !data.rows) {
    return (
      <div className="p-4 text-xs md:text-sm text-gray-500 italic bg-gray-50 rounded-md">
        No tabular data returned for this query.
      </div>
    );
  }

  const columns = data.columns;
  const rows = data.rows;



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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <TableIcon className="w-4 h-4 text-gray-500" aria-hidden="true" />
          <span className="text-xs md:text-sm font-semibold text-gray-800">{title}</span>
          <span className="text-xs text-gray-500 font-normal">
            ({filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Input */}
          <div className="relative">
            <label htmlFor="table-search" className="sr-only">Search table data</label>
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" aria-hidden="true" />
            <input
              id="table-search"
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs md:text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400 w-44 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Download CSV */}
          <button
            onClick={handleExportCSV}
            title="Download CSV"
            aria-label="Download table data as CSV"
            className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs md:text-sm font-medium border border-gray-300 rounded-md transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            CSV
          </button>
        </div>
      </div>

      {/* Table Scrollable Container */}
      <div className="overflow-x-auto max-h-[380px]">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs md:text-sm">
          <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0 border-b border-gray-200 z-10">
            <tr>
              <th className="py-2.5 px-4 w-12 text-center text-gray-400 font-mono text-xs">#</th>
              {columns.map((col, idx) => (
                <th key={idx} className="py-2.5 px-4 font-semibold text-gray-800 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-800 font-normal">
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
                    className="even:bg-white odd:bg-gray-50/50 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-center text-gray-400 font-mono text-xs">
                      {globalRowIdx}
                    </td>
                    {columns.map((col, cIdx) => {
                      const val = row[col];
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={cIdx}
                          className={`py-2.5 px-4 whitespace-nowrap ${
                            isNum ? 'font-mono text-slate-900' : 'text-gray-800'
                          }`}
                        >
                          {val === null || val === undefined ? (
                            <span className="text-gray-400 italic">null</span>
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
        <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs md:text-sm text-gray-600">
          <span>
            Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalPages}</span>
          </span>

          <div className="flex items-center space-x-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

