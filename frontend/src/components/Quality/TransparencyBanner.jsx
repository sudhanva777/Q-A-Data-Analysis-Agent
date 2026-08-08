import React from 'react';
import { AlertTriangle, CheckCircle, Sparkles, Wrench, ArrowRight } from 'lucide-react';

export default function TransparencyBanner({
  qualityScore,
  validationSummary,
  onAutoClean,
  onReviewIssues,
  onContinue,
}) {
  if (!qualityScore) return null;

  const { score, status, total_issues } = qualityScore;

  // Don't show banner for clean datasets
  if (status === 'Excellent' || status === 'Good') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600" aria-hidden="true" />
          <div>
            <span className="text-sm font-semibold text-emerald-900">Dataset is Clean</span>
            <span className="text-xs text-emerald-600 ml-2">
              Quality Score: {score}/100 · Ready for analysis
            </span>
          </div>
        </div>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-900 flex items-center space-x-1 transition-colors"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  // Show warning banner for problematic datasets
  const isUrgent = status === 'Critical' || status === 'Needs Cleaning';
  const bannerBg = isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200';
  const iconColor = isUrgent ? 'text-orange-600' : 'text-amber-600';
  const textColor = isUrgent ? 'text-orange-900' : 'text-amber-900';
  const subtextColor = isUrgent ? 'text-orange-600' : 'text-amber-600';

  return (
    <div className={`border rounded-lg p-3.5 ${bannerBg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-2.5">
          <AlertTriangle className={`w-4.5 h-4.5 ${iconColor} mt-0.5 shrink-0`} aria-hidden="true" />
          <div>
            <span className={`text-sm font-semibold ${textColor}`}>
              Dataset {status}
            </span>
            <p className={`text-xs ${subtextColor} mt-0.5`}>
              Quality Score: {score}/100 · {total_issues} issue{total_issues !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 mt-3">
        {onAutoClean && (
          <button
            type="button"
            onClick={onAutoClean}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Auto Clean
          </button>
        )}
        {onReviewIssues && (
          <button
            type="button"
            onClick={onReviewIssues}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <Wrench className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Review Issues
          </button>
        )}
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
          >
            Continue Anyway
            <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
