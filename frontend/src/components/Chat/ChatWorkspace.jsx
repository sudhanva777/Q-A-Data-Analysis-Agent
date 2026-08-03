import React, { useState, useRef, useEffect } from 'react';
import { Send, FileSpreadsheet, Database, ArrowRight, Upload } from 'lucide-react';
import MessageCard from '../Message/MessageCard';
import SequentialLoader from '../Loading/SequentialLoader';

const SAMPLE_SUGGESTIONS = [
  'What are the total sales by region?',
  'Which product department has the highest revenue?',
  'Show average performance metrics by category.',
  'What is the distribution of sales across quarters?',
];

export default function ChatWorkspace({
  messages,
  onSendMessage,
  activeDataset,
  isLoading,
  onOpenUploadModal,
}) {
  const [question, setQuestion] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    onSendMessage(question.trim());
    setQuestion('');
  };

  return (
    <main role="main" className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-[#F8FAFC] overflow-hidden relative">
      {/* Messages / Hero Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 max-w-5xl mx-auto w-full">
        {messages.length === 0 ? (
          /* Central Hero Panel Card */
          <div className="h-full flex flex-col items-center justify-center my-auto py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-2xl w-full flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md mb-4">
                <Database className="w-7 h-7" aria-hidden="true" />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Ask questions about your dataset
              </h1>
              <p className="text-base text-gray-600 mt-2 max-w-md leading-relaxed">
                Query your pandas datasets using natural language. Fast, deterministic calculation with zero LLM math hallucination.
              </p>

              {/* Action Buttons Row */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm py-2.5 px-5 rounded-md transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>Upload Dataset</span>
                </button>

                <div className="inline-flex items-center space-x-2 bg-slate-50 border border-gray-200 px-4 py-2 rounded-md text-xs md:text-sm text-gray-700">
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" aria-hidden="true" />
                  <span className="text-gray-500 font-medium">Active:</span>
                  <span className="font-semibold text-gray-900 max-w-[150px] truncate">
                    {activeDataset || 'None'}
                  </span>
                </div>
              </div>

              {/* Suggested Questions Grid Cards */}
              <div className="mt-8 w-full">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 text-left">
                  Suggested Questions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SAMPLE_SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuestion(sug)}
                      className="block w-full text-left p-4 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 group"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-gray-800 group-hover:text-blue-900 line-clamp-2">
                          {sug}
                        </p>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 ml-2" aria-hidden="true" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Conversation Trajectory */
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <MessageCard key={idx} message={msg} />
            ))}

            {/* Sequential Loader indicator */}
            {isLoading && (
              <div className="flex justify-start" role="status" aria-live="polite">
                <SequentialLoader />
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Modernized Bottom Chat Input Bar */}
      <div className="p-4 bg-white border-t border-gray-200 shadow-inner shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-400 transition-all shadow-xs">
            <label htmlFor="chat-input" className="sr-only">
              Type your analysis question
            </label>
            <input
              id="chat-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                activeDataset
                  ? `Ask a question about ${activeDataset}...`
                  : 'Ask a question about your dataset...'
              }
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-base bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-400 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              aria-label="Send message"
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium px-5 py-2.5 transition-colors flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            >
              <span className="hidden sm:inline text-sm">Analyze</span>
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 text-center text-xs text-gray-400">
            WCAG Accessible · Grounded Python Execution · Instant Response
          </div>
        </form>
      </div>
    </main>
  );
}

