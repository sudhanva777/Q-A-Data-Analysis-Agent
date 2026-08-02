import React, { useState, useRef, useEffect } from 'react';
import { Send, FileSpreadsheet, Sparkles, Database, ArrowRight } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-[#F8FAFC] overflow-hidden relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 max-w-5xl mx-auto w-full">
        {messages.length === 0 ? (
          /* Empty State Workspace */
          <div className="h-full flex flex-col items-center justify-center text-center my-auto py-12">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg mb-4">
              <Database className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Q&A Data Analysis Agent
            </h2>
            <p className="text-[14.5px] text-gray-600 mt-1 max-w-md font-medium">
              Ask natural-language questions about your tabular dataset. Every answer is computed directly by pandas — zero LLM hallucinated math.
            </p>

            {/* Attached Dataset Chip */}
            <div className="mt-4 inline-flex items-center space-x-2 bg-white border border-gray-200 px-3.5 py-1.5 rounded-full text-[13px] shadow-xs">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span className="text-gray-500 font-medium">Active File:</span>
              <span className="font-semibold text-gray-900">{activeDataset || 'sales_data.csv'}</span>
              {!activeDataset && (
                <button
                  onClick={onOpenUploadModal}
                  className="text-blue-600 hover:underline font-semibold ml-1"
                >
                  Upload New
                </button>
              )}
            </div>

            {/* Quick Starter Suggestions */}
            <div className="mt-8 w-full max-w-xl">
              <div className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Suggested Questions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SAMPLE_SUGGESTIONS.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuestion(sug);
                    }}
                    className="text-left p-3 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-200 rounded-xl text-[13px] text-gray-700 hover:text-blue-900 transition-all shadow-2xs flex items-center justify-between group"
                  >
                    <span className="line-clamp-2">{sug}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Conversation Trajectory */
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <MessageCard key={idx} message={msg} />
            ))}

            {/* Sequential Loader step indicator while in flight */}
            {isLoading && (
              <div className="flex justify-start">
                <SequentialLoader />
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Bar Fixed at Bottom */}
      <div className="p-4 bg-white border-t border-gray-200 shadow-lg shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="flex items-center bg-gray-50 border border-gray-300 focus-within:border-blue-600 focus-within:bg-white rounded-xl p-1.5 transition-all shadow-xs">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                activeDataset
                  ? `Ask a question about ${activeDataset}...`
                  : 'Ask a question about your data...'
              }
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-[14.5px] bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-400"
            />

            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-medium text-[13.5px] rounded-lg transition-colors flex items-center space-x-1.5 shadow-2xs"
            >
              <span>Analyze</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-1.5 text-center text-[11.5px] text-gray-400">
            Ground Truth Execution · Fast Python Execution · Zero LLM Math Hallucination
          </div>
        </form>
      </div>
    </div>
  );
}
