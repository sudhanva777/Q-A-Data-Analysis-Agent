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
      <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-[13.5px]">
        <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <span>No visualization chart required or generated for this query.</span>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : ''}`}>
      {/* Chart Header Toolbar */}
      <div className="p-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-4 h-4 text-blue-600" />
          <span className="text-[13.5px] font-semibold text-gray-800">{title}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {fullChartUrl && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-2.5 py-1 text-[12.5px] font-medium bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download PNG
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className={`p-4 flex items-center justify-center bg-white ${isFullscreen ? 'flex-1 overflow-auto' : 'min-h-[280px]'}`}>
        {fullChartUrl ? (
          <img
            src={fullChartUrl}
            alt="Data Analysis Chart"
            className="max-h-[420px] w-auto object-contain rounded-lg border border-gray-100 shadow-2xs"
          />
        ) : rechartsData ? (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {rechartsData.type === 'line' ? (
                <LineChart data={rechartsData.data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} angle={-20} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} />
                </LineChart>
              ) : rechartsData.type === 'pie' ? (
                <PieChart>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px' }} />
                  <Pie data={rechartsData.data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={120} fill="#2563EB">
                    {rechartsData.data.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={index % 2 === 0 ? '#2563EB' : '#93C5FD'} />
                    ))}
                  </Pie>
                </PieChart>
              ) : rechartsData.type === 'scatter' ? (
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="x" stroke="#64748B" fontSize={12} />
                  <YAxis dataKey="y" stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E7EB', borderRadius: '8px' }} />
                  <Scatter data={rechartsData.data} fill="#2563EB" />
                </ScatterChart>
              ) : (
                <BarChart data={rechartsData.data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} angle={-20} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </div>
  );
}
