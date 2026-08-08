import React from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  History, 
  Database, 
  BarChart2, 
  Check,
  RefreshCw,
  Info,
  Trash2,
  X
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
  onRefreshHistory,
  isMobileOpen = false,
  onCloseMobile
}) {
  const sidebarContent = (
    <aside
      role="complementary"
      aria-label="Sidebar Navigation"
      className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden shrink-0 select-none"
    >
      {/* Mobile Drawer Close Header */}
      {isMobileOpen && (
        <div className="p-3 border-b border-gray-200 flex items-center justify-between md:hidden bg-gray-50">
          <span className="font-semibold text-sm text-gray-900">Navigation Menu</span>
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="p-1 rounded-md text-gray-500 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Top Action Button: + New Analysis */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => {
            onNewAnalysis();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm py-2.5 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section 1: Uploaded Datasets */}
        <section aria-labelledby="datasets-heading">
          <div className="flex items-center justify-between mb-2.5">
            <h2 id="datasets-heading" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Uploaded Datasets ({datasets.length})
            </h2>
            <button
              onClick={() => {
                onOpenUploadModal();
                if (onCloseMobile) onCloseMobile();
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold focus:outline-none focus:underline"
            >
              + Upload
            </button>
          </div>

          <div className="space-y-1.5">
            {datasets.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-2 px-2">
                No datasets uploaded yet
              </div>
            ) : (
              datasets.map((d) => {
                const isActive = activeDataset === d.dataset_id;
                return (
                  <div
                    key={d.dataset_id}
                    className={`flex items-center rounded-lg border transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                        : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDataset(d.dataset_id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="flex-1 text-left px-3 py-2 rounded-l-lg text-xs md:text-sm font-medium flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <FileSpreadsheet
                          className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{d.filename}</span>
                      </div>
                      {isActive ? (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
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
                      aria-label={`Remove dataset ${d.filename}`}
                      title="Remove dataset"
                      className="mr-1 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Section 2: Active Dataset Metadata Card */}
        {datasetDetails && (
          <section aria-label="Active Dataset Metadata" className="bg-white border border-gray-200 rounded-lg p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center space-x-2 text-gray-900 font-semibold text-xs md:text-sm">
              <Database className="w-4 h-4 text-blue-500 shrink-0" aria-hidden="true" />
              <span className="truncate">{datasetDetails.filename}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-2">
                <div className="text-[10px] text-slate-500 font-medium uppercase">Records</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {datasetDetails.record_count?.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-md p-2">
                <div className="text-[10px] text-slate-500 font-medium uppercase">Columns</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {datasetDetails.column_count}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-2 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Completeness</span>
              <span className="text-xs font-bold text-emerald-600">
                {datasetDetails.completeness}%
              </span>
            </div>

            {datasetDetails.quality_score && (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Quality Score</span>
                <span className="text-xs font-bold text-blue-600">
                  {datasetDetails.quality_score.score}/100
                </span>
              </div>
            )}
          </section>
        )}

        {/* Section 3: Recent Interaction History */}
        <section aria-labelledby="history-heading">
          <div className="flex items-center justify-between mb-2">
            <h2 id="history-heading" className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
              <History className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              History ({historyLogs.length})
            </h2>
            <button
              onClick={onRefreshHistory}
              aria-label="Refresh question history"
              title="Refresh history"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-1">
            {historyLogs.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-2 px-2">
                No past questions yet
              </div>
            ) : (
              historyLogs.slice(0, 15).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onSelectHistory) onSelectHistory(item);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-start space-x-2 group focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="line-clamp-2 font-normal leading-relaxed">
                    {item.question}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
        <span className="flex items-center">
          <Info className="w-3.5 h-3.5 mr-1 text-gray-400" aria-hidden="true" />
          Pandas Engine
        </span>
        <span className="font-mono text-[11px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
          v2.0
        </span>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar (Persistent) */}
      <div className="hidden md:flex h-[calc(100vh-64px)]">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (Collapsible) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Sliding Panel */}
          <div className="relative z-50 w-[280px] max-w-full bg-white h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

