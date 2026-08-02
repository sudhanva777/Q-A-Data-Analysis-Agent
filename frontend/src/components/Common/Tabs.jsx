import React from 'react';

export default function Tabs({ tabs, activeTab, onChangeTab }) {
  return (
    <div className="border-b border-gray-200 bg-white px-2 pt-2">
      <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`py-2.5 px-4 rounded-t-lg text-[13.5px] font-medium transition-all duration-150 flex items-center space-x-2 whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-semibold ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
