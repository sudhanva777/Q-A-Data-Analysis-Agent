import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, Settings as SettingsIcon, LayoutDashboard, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Navbar({ activeDataset, isConnected }) {
  const location = useLocation();

  return (
    <header className="h-[64px] bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-[17px] font-bold text-gray-900 leading-snug tracking-tight">
            Q&A Data Analysis Agent
          </h1>
          <p className="text-[12px] text-gray-500 font-medium hidden sm:block">
            Grounded Pandas Analysis Engine
          </p>
        </div>
      </div>

      {/* Center: Active Dataset Badge */}
      <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full text-[13px]">
        <span className="text-gray-500 font-medium">Dataset:</span>
        {activeDataset ? (
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-gray-900 max-w-[180px] truncate">
              {activeDataset}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Connected
            </span>
          </div>
        ) : (
          <span className="text-gray-400 font-medium italic">None selected</span>
        )}
      </div>

      {/* Right Navigation & System Health */}
      <div className="flex items-center space-x-2">
        <nav className="flex items-center space-x-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-md text-[14px] font-medium transition-colors flex items-center space-x-1.5 ${
              location.pathname === '/'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/settings"
            className={`px-3 py-1.5 rounded-md text-[14px] font-medium transition-colors flex items-center space-x-1.5 ${
              location.pathname === '/settings'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* API Health indicator */}
        <div className="flex items-center space-x-1.5 text-[12px] font-medium px-2 py-1">
          {isConnected ? (
            <span className="flex items-center text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              API Ready
            </span>
          ) : (
            <span className="flex items-center text-amber-600">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              Connecting...
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
