import React from 'react';
import {
  Lightbulb, TrendingUp, AlertTriangle, CheckCircle,
  Database, PieChart, Zap, AlertOctagon, Info
} from 'lucide-react';

const ICON_MAP = {
  Database: Database,
  TrendingUp: TrendingUp,
  AlertTriangle: AlertTriangle,
  CheckCircle: CheckCircle,
  PieChart: PieChart,
  Zap: Zap,
  Lightbulb: Lightbulb,
  AlertOctagon: AlertOctagon,
  Info: Info,
};

const TYPE_STYLES = {
  info: { bg: 'bg-blue-50', border: 'border-blue-100', iconColor: 'text-blue-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-100', iconColor: 'text-amber-500' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-100', iconColor: 'text-emerald-500' },
  error: { bg: 'bg-red-50', border: 'border-red-100', iconColor: 'text-red-500' },
};

export default function InsightsPanel({ insights, isExpanded = true }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-1">
        <Lightbulb className="w-4 h-4 text-blue-500" aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Auto-Generated Insights
        </h3>
        <span className="text-xs text-gray-400 font-medium">({insights.length})</span>
      </div>

      <div className={`space-y-2 ${isExpanded ? '' : 'max-h-64 overflow-y-auto'}`}>
        {insights.map((insight, idx) => {
          const Icon = ICON_MAP[insight.icon] || Info;
          const style = TYPE_STYLES[insight.type] || TYPE_STYLES.info;

          return (
            <div
              key={idx}
              className={`rounded-lg border p-3 ${style.bg} ${style.border}`}
            >
              <div className="flex items-start space-x-2.5">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.iconColor}`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-gray-900">{insight.title}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{insight.category}</span>
                  </div>
                  <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
