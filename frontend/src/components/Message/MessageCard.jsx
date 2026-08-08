import React, { useState } from 'react';
import {
  FileText,
  Table as TableIcon,
  BarChart3,
  Code,
  Terminal,
  Bot,
  User,
  Clock,
  CheckCircle2
} from 'lucide-react';
import Tabs from '../Common/Tabs';
import DataTable from '../Tables/DataTable';
import ChartViewer from '../Charts/ChartViewer';
import CodeBlock from '../CodeViewer/CodeBlock';

export default function MessageCard({ message }) {
  const [activeTab, setActiveTab] = useState('summary');

  if (message.role === 'user') {
    return (
      <div className="flex justify-end my-4">
        <div className="flex items-start space-x-2.5 max-w-2xl">
          <div className="bg-blue-500 text-white rounded-lg rounded-tr-none px-4 py-3 shadow-xs">
            <p className="text-sm md:text-base leading-relaxed font-normal">{message.content}</p>
            {message.datasetId && (
              <div className="mt-2 text-xs bg-blue-600/60 px-2.5 py-0.5 rounded text-blue-100 font-medium inline-block">
                Dataset: {message.datasetId}
              </div>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            <User className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant Response Card
  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'table', label: 'Table', icon: TableIcon },
    { id: 'chart', label: 'Chart', icon: BarChart3 },
    { id: 'code', label: 'Generated Code', icon: Code },
    { id: 'logs', label: 'Logs', icon: Terminal },
  ];

  return (
    <div className="flex justify-start my-5 w-full">
      <div className="flex items-start space-x-3 w-full max-w-4xl">
        <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-xs shrink-0 mt-1">
          <Bot className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Assistant Header */}
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-gray-900">Analysis Result</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />
                Grounded Pandas Output
              </span>
            </div>

            {message.latency_ms && (
              <div className="flex items-center text-xs text-gray-500 font-medium">
                <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" aria-hidden="true" />
                <span>{Math.round(message.latency_ms)} ms</span>
              </div>
            )}
          </div>

          {/* Result Tabs Navigation */}
          <Tabs tabs={tabs} activeTab={activeTab} onChangeTab={setActiveTab} />

          {/* Tab Content Viewers */}
          <div className="p-5">
            {activeTab === 'summary' && (
              <div className="prose prose-slate max-w-none text-sm md:text-base leading-relaxed text-gray-800">
                <div className="bg-blue-50/60 border-l-4 border-blue-500 p-4 rounded-r-md">
                  <h3 className="text-xs uppercase font-bold text-blue-900 tracking-wider mb-1.5">
                    Plain-English Explanation
                  </h3>
                  <p className="text-gray-900 font-normal leading-relaxed">
                    {message.answer || message.explanation || 'No summary available.'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'table' && (
              <DataTable data={message.table} title="Supporting Tabular Data" />
            )}

            {activeTab === 'chart' && (
              <ChartViewer chartUrl={message.chart_url} tableData={message.table} chartData={message.chart_data} />
            )}

            {activeTab === 'code' && (
              <CodeBlock code={message.generated_code} language="python" />
            )}

            {activeTab === 'logs' && (
              <div className="space-y-3 font-mono text-xs bg-slate-900 text-slate-200 p-4 rounded-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Execution Status:</span>
                  <span className="text-emerald-400 font-semibold uppercase">
                    {message.status || 'SUCCESS'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total Latency:</span>
                  <span>{message.latency_ms ? `${Math.round(message.latency_ms)} ms` : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Inference Engine:</span>
                  <span className="text-blue-400">Groq (llama-3.3-70b-versatile)</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Dataset Context:</span>
                  <span className="text-slate-300">{message.datasetId || 'Default Dataset'}</span>
                </div>
                {message.analysis_plan && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-slate-400 mb-1">Analysis Plan:</div>
                    <pre className="text-slate-300 whitespace-pre-wrap text-[11px] leading-relaxed">
                      {JSON.stringify(message.analysis_plan, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

