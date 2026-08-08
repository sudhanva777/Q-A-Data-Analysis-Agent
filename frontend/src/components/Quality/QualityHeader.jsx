import React from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

const STATUS_CONFIG = {
  Excellent: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', barColor: 'bg-emerald-500', Icon: CheckCircle },
  Good: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', barColor: 'bg-blue-500', Icon: CheckCircle },
  'Needs Review': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', barColor: 'bg-amber-500', Icon: AlertTriangle },
  'Needs Cleaning': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', barColor: 'bg-orange-500', Icon: AlertTriangle },
  Critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', barColor: 'bg-red-500', Icon: XCircle },
};

export default function QualityHeader({ qualityScore }) {
  if (!qualityScore) return null;

  const { score, status, dimensions, issue_counts, total_issues } = qualityScore;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Good;
  const StatusIcon = config.Icon;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4`}>
      {/* Top Row: Score + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5 text-blue-500" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">{score}</span>
              <span className="text-sm text-gray-500 font-medium">/ 100</span>
            </div>
            <span className="text-xs text-gray-500">Data Quality Score</span>
          </div>
        </div>

        <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
          <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{status}</span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="w-full bg-white rounded-full h-2 mb-3 border border-gray-100">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${config.barColor}`}
          style={{ width: `${Math.max(score, 2)}%` }}
        />
      </div>

      {/* Dimension Breakdown */}
      {dimensions && (
        <div className="grid grid-cols-5 gap-2 mb-3">
          {Object.entries(dimensions).map(([key, val]) => (
            <div key={key} className="text-center bg-white rounded-md p-2 border border-gray-100">
              <div className="text-xs font-semibold text-gray-900">{val}%</div>
              <div className="text-[10px] text-gray-500 capitalize">{key}</div>
            </div>
          ))}
        </div>
      )}

      {/* Issue Counts */}
      {issue_counts && total_issues > 0 && (
        <div className="flex items-center space-x-3 text-xs text-gray-600">
          <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
          <span>
            {total_issues} issue{total_issues !== 1 ? 's' : ''} found
            {issue_counts.critical > 0 && <span className="ml-1 text-red-600 font-semibold">({issue_counts.critical} critical)</span>}
            {issue_counts.high > 0 && <span className="ml-1 text-orange-600 font-semibold">({issue_counts.high} high)</span>}
          </span>
        </div>
      )}
    </div>
  );
}
