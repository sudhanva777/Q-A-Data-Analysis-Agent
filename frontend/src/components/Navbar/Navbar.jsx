import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, Settings as SettingsIcon, LayoutDashboard, CheckCircle2, AlertCircle, Menu, Sparkles } from 'lucide-react';

export default function Navbar({ activeDataset, isConnected, onToggleMobileSidebar }) {
  const location = useLocation();

  return (
    <header role="banner" className="h-[64px] bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Brand Logo & Mobile Toggle */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Button */}
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md md:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        <Link
          to="/"
          className="flex items-center space-x-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 p-1"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-xs">
            <Database className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[18px] font-bold text-gray-900 tracking-tight">
              InsightFlow
            </span>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
              v1.0
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Active Dataset Badge (Desktop & Tablet) */}
      <div className="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs md:text-sm">
        <span className="text-gray-500 font-medium">Dataset:</span>
        {activeDataset ? (
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-gray-900 max-w-[160px] md:max-w-[220px] truncate">
              {activeDataset}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />
              Connected
            </span>
          </div>
        ) : (
          <span className="text-gray-400 font-medium italic">None selected</span>
        )}
      </div>

      {/* Right Navigation & System Health */}
      <div className="flex items-center space-x-2">
        <nav role="navigation" aria-label="Main Navigation" className="flex items-center space-x-1">
          <Link
            to="/"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              location.pathname === '/'
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/settings"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              location.pathname === '/settings'
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <SettingsIcon className="w-4 h-4" aria-hidden="true" />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

        {/* API Health Indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs font-medium px-2 py-1" role="status" aria-live="polite">
          {isConnected ? (
            <span className="flex items-center text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              API Ready
            </span>
          ) : (
            <span className="flex items-center text-amber-600">
              <AlertCircle className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Connecting...
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

