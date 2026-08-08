import React, { useState } from 'react';
import { Download, Maximize2, BarChart3, Image as ImageIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#3B82F6', '#6B7280', '#1E3A5F', '#93C5FD', '#475569', '#1D4ED8', '#9CA3AF', '#2563EB'];

// Heatmap color scale - blue to red for correlations
const HEATMAP_COLORS = ['#1E3A5F', '#3B82F6', '#93C5FD', '#FEF3C7', '#FBBF24', '#F97316', '#EF4444', '#DC2626'];

function getHeatmapColor(value) {
  // value is between -1 and 1 for correlations
  const normalized = (value + 1) / 2; // 0 to 1
  const idx = Math.min(Math.floor(normalized * (HEATMAP_COLORS.length - 1)), HEATMAP_COLORS.length - 1);
  return HEATMAP_COLORS[idx];
}

function HeatmapChart({ data, config }) {
  if (!data || data.length === 0) return null;
  
  // Extract unique x and y categories
  const xCategories = [...new Set(data.map(d => d.x))];
  const yCategories = [...new Set(data.map(d => d.y))];
  
  // Create a lookup for values
  const valueMap = {};
  data.forEach(d => {
    valueMap[`${d.x}-${d.y}`] = d.value;
  });

  return (
    <div className="w-full">
      <div className="h-[320px] flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 500 320" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="heatmapLegend" x1="0%" y1="0%" x2="100%" y2="0%">
              {HEATMAP_COLORS.map((color, i) => (
                <stop key={i} offset={`${(i / (HEATMAP_COLORS.length - 1)) * 100}%`} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          
          <g transform="translate(60, 20)">
            {/* Y-axis labels */}
            {yCategories.map((cat, i) => (
              <text
                key={`y-${cat}`}
                x="-10"
                y={i * 30 + 15}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="#64748B"
                className="axis-label"
              >
                {cat.length > 12 ? cat.substring(0, 12) + '…' : cat}
              </text>
            ))}
            
            {/* X-axis labels (rotated) */}
            {xCategories.map((cat, i) => (
              <text
                key={`x-${cat}`}
                x={i * 40 + 20}
                y={yCategories.length * 30 + 35}
                textAnchor="end"
                dominantBaseline="hanging"
                fontSize="11"
                fill="#64748B"
                transform={`rotate(-45, ${i * 40 + 20}, ${yCategories.length * 30 + 35})`}
                className="axis-label"
              >
                {cat.length > 12 ? cat.substring(0, 12) + '…' : cat}
              </text>
            ))}
            
            {/* Heatmap cells */}
            {data.map((d, idx) => {
              const xIdx = xCategories.indexOf(d.x);
              const yIdx = yCategories.indexOf(d.y);
              const color = getHeatmapColor(d.value);
              return (
                <rect
                  key={idx}
                  x={xIdx * 40}
                  y={yIdx * 30}
                  width={36}
                  height={26}
                  fill={color}
                  rx={3}
                  ry={3}
                  opacity={0.9}
                />
              );
            })}
            
            {/* Value labels on cells */}
            {data.map((d, idx) => {
              const xIdx = xCategories.indexOf(d.x);
              const yIdx = yCategories.indexOf(d.y);
              const color = getHeatmapColor(d.value);
              // Use white text for dark colors, black for light
              const isDark = d.value < -0.2 || d.value > 0.6;
              return (
                <text
                  key={`val-${idx}`}
                  x={xIdx * 40 + 18}
                  y={yIdx * 30 + 17}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill={isDark ? '#FFFFFF' : '#1E293B'}
                  fontWeight="500"
                >
                  {d.value.toFixed(2)}
                </text>
              );
            })}
          </g>
          
          {/* Color legend */}
          <g transform="translate(60, {yCategories.length * 30 + 80})">
            <rect x="0" y="0" width="200" height="12" fill="url(#heatmapLegend)" rx="3" />
            <text x="0" y="-5" fontSize="9" fill="#64748B">-1.0</text>
            <text x="200" y="-5" fontSize="9" fill="#64748B" textAnchor="end">1.0</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function ChartViewer({ chartUrl, tableData, chartData, title = 'Generated Visualization' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('both'); // 'static' | 'interactive' | 'both'

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const fullChartUrl = chartUrl
    ? chartUrl.startsWith('http')
      ? chartUrl
      : `${BASE_URL}${chartUrl}`
    : null;

  // Prefer backend-supplied chart payload, then fall back to a simple table-derived chart.
  const rechartsData = React.useMemo(() => {
    if (chartData?.data) {
      return chartData;
    }
    if (!tableData || !tableData.columns || !tableData.rows || tableData.rows.length === 0) {
      return null;
    }
    const cols = tableData.columns;
    if (cols.length >= 2) {
      const xKey = cols[0];
      const yKey = cols[1];
      const parsed = tableData.rows.slice(0, 15).map((r) => ({
        name: String(r[xKey] ?? ''),
        value: typeof r[yKey] === 'number' ? r[yKey] : parseFloat(r[yKey]) || 0,
      }));
      if (parsed.some((item) => !isNaN(item.value) && item.value !== 0)) {
        return { type: 'bar', data: parsed, xKey: 'name', yKey: 'value', labelY: yKey };
      }
    }
    return null;
  }, [chartData, tableData]);

  const handleDownload = () => {
    if (fullChartUrl) {
      const link = document.createElement('a');
      link.href = fullChartUrl;
      link.download = 'data_analysis_chart.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!fullChartUrl && !rechartsData) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-xs md:text-sm">
        <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" aria-hidden="true" />
        <span>No visualization chart required or generated for this query.</span>
      </div>
    );
  }

  const showStatic = fullChartUrl && (viewMode === 'static' || viewMode === 'both');
  const showInteractive = rechartsData && (viewMode === 'interactive' || viewMode === 'both');

  const renderRechartsChart = () => {
    if (!rechartsData) return null;
    const data = rechartsData.data;
    const chartType = rechartsData.type || 'bar';
    const chartTitle = rechartsData.title || title;
    const config = rechartsData.config || {};
    const seriesKeys = rechartsData.seriesKeys || [];

    // Handle heatmap separately since it uses custom SVG
    if (chartType === 'heatmap') {
      return (
        <div className="w-full">
          {chartTitle && <div className="text-xs font-semibold text-gray-600 mb-2 text-center">{chartTitle}</div>}
          <HeatmapChart data={data} config={config} />
        </div>
      );
    }

    return (
      <div className="w-full">
        {chartTitle && <div className="text-xs font-semibold text-gray-600 mb-2 text-center">{chartTitle}</div>}
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} angle={-20} textAnchor="end" />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name={config.yAxisLabel || 'Value'} />
                {seriesKeys.slice(1).map((key, idx) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[(idx + 1) % CHART_COLORS.length]} strokeWidth={1.5} dot={{ r: 2 }} />
                ))}
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} angle={-20} textAnchor="end" />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            ) : chartType === 'pie' ? (
              <PieChart>
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                <Legend />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={120} fill="#3B82F6" label>
                  {data.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : chartType === 'scatter' ? (
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="x" stroke="#64748B" fontSize={12} name={config.xAxisLabel || 'X'} />
                <YAxis dataKey="y" stroke="#64748B" fontSize={12} name={config.yAxisLabel || 'Y'} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                <Scatter data={data} fill="#3B82F6" />
              </ScatterChart>
            ) : (
              /* Default: bar chart */
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} angle={-20} textAnchor="end" />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} name={config.yAxisLabel || 'Value'} />
                {seriesKeys.slice(1).map((key, idx) => (
                  <Bar key={key} dataKey={key} fill={CHART_COLORS[(idx + 1) % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : ''}`}>
      {/* Chart Header Toolbar */}
      <div className="p-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-4 h-4 text-blue-500" aria-hidden="true" />
          <span className="text-xs md:text-sm font-semibold text-gray-800">{title}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* View Mode Toggle */}
          {fullChartUrl && rechartsData && (
            <div className="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden mr-2">
              <button
                type="button"
                onClick={() => setViewMode('static')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'static' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Static
              </button>
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors border-x border-gray-200 ${viewMode === 'interactive' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Interactive
              </button>
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'both' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Both
              </button>
            </div>
          )}

          {fullChartUrl && (
            <button
              onClick={handleDownload}
              aria-label="Download chart image as PNG"
              className="inline-flex items-center px-3 py-1.5 text-xs md:text-sm font-medium bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Download PNG
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className={`p-4 bg-white ${isFullscreen ? 'flex-1 overflow-auto' : ''}`}>
        <div className={`flex ${viewMode === 'both' && showStatic && showInteractive ? 'flex-col space-y-4' : 'items-center justify-center'}`}>
          {showStatic && (
            <div className="flex items-center justify-center min-h-[280px]">
              <img
                src={fullChartUrl}
                alt="Data Analysis Chart Visualization"
                className="max-h-[420px] w-auto object-contain rounded-md border border-gray-200 shadow-2xs"
              />
            </div>
          )}
          {showInteractive && (
            <div className="min-h-[280px]">
              {renderRechartsChart()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
