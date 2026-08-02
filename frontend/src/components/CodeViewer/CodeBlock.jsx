import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

export default function CodeBlock({ code, language = 'python' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!code) {
    return (
      <div className="p-4 text-[13px] text-gray-500 italic bg-gray-50 rounded-lg">
        No code available for this step.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden shadow-xs border border-slate-800 font-mono text-[13px]">
      {/* Header Bar */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[12px] text-slate-400">
        <div className="flex items-center space-x-2">
          <Code className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-300 uppercase tracking-wider">{language}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">AST Sandboxed Execution</span>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center px-2 py-1 text-[11.5px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1 text-slate-400" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto leading-relaxed">
        <pre className="text-emerald-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
