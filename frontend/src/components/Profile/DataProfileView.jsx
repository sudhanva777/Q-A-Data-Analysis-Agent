import React, { useState } from 'react';
import {
  Columns, Hash, Type, Calendar, BarChart3, AlertTriangle,
  ChevronDown, ChevronRight, Database
} from 'lucide-react';

function ColumnDetailRow({ name, meta }) {
  const [expanded, setExpanded] = useState(false);

  const dtype = meta.dtype || 'object';
  const nullPct = meta.null_pct ?? 0;
  const uniqueCount = meta.unique_count ?? 0;

  const getDtypeIcon = (dt) => {
    if (dt.includes('int') || dt.includes('float')) return <Hash className="w-3.5 h-3.5 text-blue-500" />;
    if (dt.includes('datetime') || dt.includes('date')) return <Calendar className="w-3.5 h-3.5 text-blue-500" />;
    if (dt.includes('bool')) return <BarChart3 className="w-3.5 h-3.5 text-blue-500" />;
    return <Type className="w-3.5 h-3.5 text-gray-500" />;
  };

  return (
    <div className="border border-gray-100 rounded-md bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          {getDtypeIcon(dtype)}
          <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
          <span className="text-xs text-gray-400 font-mono">{dtype}</span>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          {nullPct > 0 && (
            <span className={`text-xs font-medium ${nullPct > 20 ? 'text-orange-600' : 'text-gray-500'}`}>
              {nullPct}% null
            </span>
          )}
          <span className="text-xs text-gray-400">{uniqueCount} unique</span>
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Nulls:</span>{' '}
              <span className="font-medium text-gray-900">{meta.null_count ?? 0}</span>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Cardinality:</span>{' '}
              <span className="font-medium text-gray-900">{(meta.cardinality_pct ?? 0)}%</span>
            </div>
          </div>

          {/* Numeric stats */}
          {meta.stats && (
            <div className="mt-2">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Numeric Statistics</div>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {['min', 'max', 'mean', 'median'].map((key) => (
                  <div key={key} className="bg-blue-50 rounded p-1.5 text-center">
                    <div className="text-[10px] text-gray-500">{key}</div>
                    <div className="text-xs font-medium text-gray-900">{meta.stats[key] ?? 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date stats */}
          {meta.date_stats && (
            <div className="mt-2">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Date Range</div>
              <div className="text-xs text-gray-700">
                {meta.date_stats.min_date} → {meta.date_stats.max_date} ({meta.date_stats.range_days} days)
              </div>
            </div>
          )}

          {/* Top categories */}
          {meta.top_categories && meta.top_categories.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Top Categories</div>
              <div className="space-y-1">
                {meta.top_categories.slice(0, 5).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate max-w-[200px]">{cat.category}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${Math.min(cat.percentage, 100)}%` }} />
                      </div>
                      <span className="text-gray-500 w-12 text-right">{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested type */}
          {meta.suggested_type && (
            <div className="mt-2 flex items-center space-x-2 text-xs bg-amber-50 p-2 rounded border border-amber-100">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span className="text-amber-700">
                Stored as <span className="font-medium">{dtype}</span>, suggested: <span className="font-semibold">{meta.suggested_type}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataProfileView({ profile }) {
  if (!profile) return null;

  const columns = profile.columns || {};
  const special = profile.special_columns || {};
  const colEntries = Object.entries(columns);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <Database className="w-4 h-4 text-blue-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-bold text-gray-900">{profile.dimensions?.rows?.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Rows</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <Columns className="w-4 h-4 text-blue-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-bold text-gray-900">{profile.dimensions?.columns}</div>
          <div className="text-xs text-gray-500">Columns</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900">{profile.missingness?.overall_missing_pct}%</div>
          <div className="text-xs text-gray-500">Missing</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900">{profile.duplication?.duplicate_pct}%</div>
          <div className="text-xs text-gray-500">Duplicates</div>
        </div>
      </div>

      {/* Special Column Flags */}
      {(special.geographic_columns?.length > 0 ||
        special.currency_columns?.length > 0 ||
        special.potential_primary_keys?.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {special.potential_primary_keys?.map((c) => (
            <span key={c} className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 font-medium">🔑 {c}</span>
          ))}
          {special.geographic_columns?.map((c) => (
            <span key={c} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 font-medium">🌍 {c}</span>
          ))}
          {special.currency_columns?.map((c) => (
            <span key={c} className="px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-100 font-medium">💲 {c}</span>
          ))}
        </div>
      )}

      {/* Column Explorer */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          Column Explorer ({colEntries.length})
        </h3>
        <div className="space-y-1.5">
          {colEntries.map(([name, meta]) => (
            <ColumnDetailRow key={name} name={name} meta={meta} />
          ))}
        </div>
      </div>
    </div>
  );
}
