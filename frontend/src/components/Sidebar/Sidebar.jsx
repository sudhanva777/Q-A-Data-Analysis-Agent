import React from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  History, 
  Database, 
  ChevronRight, 
  BarChart2, 
  Check,
  RefreshCw,
  Info,
  Trash2
} from 'lucide-react';

export default function Sidebar({
  datasets = [],
  activeDataset,
  onSelectDataset,
  datasetDetails,
  historyLogs = [],
  onSelectHistory,
  onNewAnalysis,
  onOpenUploadModal,
  onDeleteDataset,
  isLoadingHistory,
  onRefreshHistory
}) {
  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-64px)] overflow-hidden shrink-0 select-none">
      {/* Top Action Button: + New Analysis */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={onNewAnalysis}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-[14px] py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section 1: Uploaded Datasets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Uploaded Datasets ({datasets.length})
            </span>
            <button
              onClick={onOpenUploadModal}
              className="text-[12px] text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              + Upload
            </button>
          </div>

          <div className="space-y-1">
            {datasets.length === 0 ? (
              <div className="text-[13px] text-gray-400 italic py-2 px-2">
                No datasets uploaded yet
              </div>
            ) : (
              datasets.map((d) => {
                const isActive = activeDataset === d.dataset_id;
                return (
                  <div
                    key={d.dataset_id}
                    className={`flex items-center rounded-lg border transition-all group ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDataset(d.dataset_id)}
                      className="flex-1 text-left px-3 py-2 rounded-l-lg text-[13.5px] font-medium flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        <span className="truncate">{d.filename}</span>
                      </div>
                      {isActive ? (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <span className="text-[11px] text-gray-400 font-normal shrink-0">
                          {d.size_formatted}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDataset?.(d.dataset_id);
                      }}
                      title="Remove dataset"
                      className="mr-1 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 2: Active Dataset Metadata Overview */}
        {datasetDetails && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center space-x-2 text-slate-800 font-semibold text-[13px]">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="truncate">{datasetDetails.filename}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <div className="text-[11px] text-slate-500 font-medium uppercase">Records</div>
                <div className="text-[15px] font-bold text-slate-900 mt-0.5">
                  {datasetDetails.record_count?.toLocaleString()}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <div className="text-[11px] text-slate-500 font-medium uppercase">Columns</div>
                <div className="text-[15px] font-bold text-slate-900 mt-0.5">
                  {datasetDetails.column_count}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
              <span className="text-[12px] text-slate-500 font-medium">Completeness</span>
              <span className="text-[13px] font-bold text-emerald-600">
                {datasetDetails.completeness}%
              </span>
            </div>
          </div>
        )}

        {/* Section 3: Recent Interaction History */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center">
              <History className="w-3.5 h-3.5 mr-1" />
              History ({historyLogs.length})
            </span>
            <button
              onClick={onRefreshHistory}
              title="Refresh history"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-1">
            {historyLogs.length === 0 ? (
              <div className="text-[12.5px] text-gray-400 italic py-2 px-2">
                No past questions yet
              </div>
            ) : (
              historyLogs.slice(0, 15).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectHistory && onSelectHistory(item)}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-[13px] text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-start space-x-2 group"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 font-normal leading-snug">
                    {item.question}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 text-[12px] text-gray-500 flex items-center justify-between">
        <span className="flex items-center">
          <Info className="w-3.5 h-3.5 mr-1 text-gray-400" />
          Groq + Pandas Engine
        </span>
        <span className="font-mono text-[11px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
          v1.0
        </span>
      </div>
    </aside>
  );
}
