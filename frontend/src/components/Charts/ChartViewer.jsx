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
} from 'recharts';

export default function ChartViewer({ chartUrl, tableData, chartData, title = 'Generated Visualization' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : ''}`}>
      {/* Chart Header Toolbar */}
      <div className="p-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-4 h-4 text-blue-500" aria-hidden="true" />
          <span className="text-xs md:text-sm font-semibold text-gray-800">{title}</span>
        </div>

        <div className="flex items-center space-x-1.5">
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
      <div className={`p-4 flex items-center justify-center bg-white ${isFullscreen ? 'flex-1 overflow-auto' : 'min-h-[280px]'}`}>
        {fullChartUrl ? (
          <img
            src={fullChartUrl}
            alt="Data Analysis Chart Visualization"
            className="max-h-[420px] w-auto object-contain rounded-md border border-gray-200 shadow-2xs"
          />
        ) : rechartsData ? (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {rechartsData.type === 'line' ? (
                <LineChart data={rechartsData.data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} angle={-20} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                  <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              ) : rechartsData.type === 'pie' ? (
                <PieChart>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                  <Pie data={rechartsData.data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={120} fill="#3B82F6">
                    {rechartsData.data.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#93C5FD'} />
                    ))}
                  </Pie>
                </PieChart>
              ) : rechartsData.type === 'scatter' ? (
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="x" stroke="#64748B" fontSize={12} />
                  <YAxis dataKey="y" stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                  <Scatter data={rechartsData.data} fill="#3B82F6" />
                </ScatterChart>
              ) : (
                <BarChart data={rechartsData.data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} angle={-20} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </div>
  );
}

