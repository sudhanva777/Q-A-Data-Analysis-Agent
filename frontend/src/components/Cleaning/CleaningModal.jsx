import React, { useState } from 'react';
import { X, Sparkles, Wrench, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CLEANING_OPERATIONS = [
  { id: 'trim_whitespace', label: 'Trim Whitespace', description: 'Remove leading/trailing spaces from text columns' },
  { id: 'normalize_casing', label: 'Normalize Casing', description: 'Standardize text to title case in low-cardinality columns' },
  { id: 'normalize_currencies', label: 'Clean Currencies', description: 'Strip currency symbols ($, €, £) and convert to numeric' },
  { id: 'normalize_percentages', label: 'Clean Percentages', description: 'Strip % symbols and convert to numeric values' },
  { id: 'fix_date_formats', label: 'Fix Date Formats', description: 'Parse date strings into proper datetime columns' },
  { id: 'remove_duplicates', label: 'Remove Duplicates', description: 'Drop exact duplicate rows' },
  { id: 'remove_empty_columns', label: 'Remove Empty Columns', description: 'Drop columns that are 100% null' },
  { id: 'remove_constant_columns', label: 'Remove Constants', description: 'Drop columns with only one unique value' },
  { id: 'handle_missing', label: 'Handle Missing Values', description: 'Impute numeric with median, text with mode' },
  { id: 'handle_outliers', label: 'Handle Outliers', description: 'Clip numeric values to IQR bounds' },
];

export default function CleaningModal({
  isOpen,
  onClose,
  datasetId,
  validationIssues,
  onCleaningComplete,
}) {
  const [selectedOps, setSelectedOps] = useState(new Set(['trim_whitespace', 'normalize_casing', 'remove_duplicates']));
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningResult, setCleaningResult] = useState(null);

  if (!isOpen) return null;

  const toggleOp = (opId) => {
    setSelectedOps((prev) => {
      const next = new Set(prev);
      if (next.has(opId)) {
        next.delete(opId);
      } else {
        next.add(opId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedOps(new Set(CLEANING_OPERATIONS.map((op) => op.id)));
  };

  const deselectAll = () => {
    setSelectedOps(new Set());
  };

  const handleClean = async () => {
    if (selectedOps.size === 0) {
      toast.error('Select at least one cleaning operation.');
      return;
    }
    setIsCleaning(true);
    setCleaningResult(null);
    try {
      const result = await api.cleanDataset(datasetId, Array.from(selectedOps));
      setCleaningResult(result);
      toast.success(`Dataset cleaned → ${result.cleaned_dataset_id}`);
      if (onCleaningComplete) {
        onCleaningComplete(result);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Cleaning failed.';
      toast.error(msg);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cleaning-modal-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl border border-gray-200 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-blue-500" aria-hidden="true" />
            <h2 id="cleaning-modal-title" className="text-lg font-bold text-gray-900">
              Smart Data Cleaning
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cleaning dialog"
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!cleaningResult ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Select operations to clean <span className="font-semibold text-gray-900">{datasetId}</span>.
                  Original dataset is never overwritten.
                </p>
                <div className="flex items-center space-x-2">
                  <button type="button" onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {CLEANING_OPERATIONS.map((op) => (
                  <label
                    key={op.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedOps.has(op.id)
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOps.has(op.id)}
                      onChange={() => toggleOp(op.id)}
                      className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{op.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{op.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Validation Issues Preview */}
              {validationIssues && validationIssues.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Detected Issues ({validationIssues.length})
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {validationIssues.slice(0, 8).map((issue, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs">
                        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? 'text-red-500' : 'text-amber-500'
                        }`} aria-hidden="true" />
                        <span className="text-gray-700">{issue.message}</span>
                      </div>
                    ))}
                    {validationIssues.length > 8 && (
                      <div className="text-xs text-gray-400 italic">... and {validationIssues.length - 8} more</div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Cleaning Result Report */
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-emerald-700">
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-semibold">{cleaningResult.message}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium mb-1">Before</div>
                  <div className="text-sm text-gray-900">{cleaningResult.stats_before?.rows} rows · {cleaningResult.stats_before?.columns} cols · {cleaningResult.stats_before?.nulls} nulls</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <div className="text-xs text-emerald-600 font-medium mb-1">After</div>
                  <div className="text-sm text-gray-900">{cleaningResult.stats_after?.rows} rows · {cleaningResult.stats_after?.columns} cols · {cleaningResult.stats_after?.nulls} nulls</div>
                </div>
              </div>

              {cleaningResult.modifications && cleaningResult.modifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Modifications</h3>
                  <ul className="space-y-1">
                    {cleaningResult.modifications.map((mod, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start space-x-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{mod}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Cleaned dataset saved as <span className="font-semibold text-gray-900">{cleaningResult.cleaned_dataset_id}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {cleaningResult ? 'Done' : 'Cancel'}
          </button>
          {!cleaningResult && (
            <button
              type="button"
              onClick={handleClean}
              disabled={isCleaning || selectedOps.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-400 rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
            >
              {isCleaning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Cleaning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Clean Dataset</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
