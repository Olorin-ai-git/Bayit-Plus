import React from 'react';
import { MdSearch, MdListAlt, MdSettings, MdChat } from 'react-icons/md';

/**
 * Props for the NavigationBar component.
 */
interface NavigationBarProps {
  activeTab: 'investigation' | 'investigations' | 'settings' | 'rag';
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTabChange: (tab: 'investigation' | 'investigations' | 'settings' | 'rag') => void;
}

/**
 * Navigation bar for switching between investigation tabs.
 * @param {NavigationBarProps} props - The navigation bar props (activeTab, onTabChange)
 * @returns {JSX.Element} The rendered navigation bar component
 */
const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  onTabChange,
}) => (
  <aside className="right-0 top-0 h-full w-20 bg-white shadow-lg flex flex-col items-center py-8 z-50 border-l border-gray-200">
    <div className="relative group mb-4 w-full flex justify-center">
      <button
        type="button"
        className={`flex flex-col items-center px-2 py-4 rounded-lg transition-colors duration-200 w-16 ${
          activeTab === 'investigation'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        onClick={() => onTabChange('investigation')}
        aria-label="Current Investigation"
      >
        {React.createElement(MdSearch as unknown as React.ElementType, {
          size: 28,
        })}
        <span className="sr-only">Current Investigation</span>
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
        Current Investigation
      </div>
    </div>
    <div className="relative group mb-4 w-full flex justify-center">
      <button
        type="button"
        className={`flex flex-col items-center px-2 py-4 rounded-lg transition-colors duration-200 w-16 ${
          activeTab === 'investigations'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        onClick={() => onTabChange('investigations')}
        aria-label="All Investigations"
      >
        {React.createElement(MdListAlt as unknown as React.ElementType, {
          size: 28,
        })}
        <span className="sr-only">All Investigations</span>
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
        All Investigations
      </div>
    </div>
    <div className="relative group mb-4 w-full flex justify-center">
      <button
        type="button"
        className={`w-full py-3 px-4 rounded-lg transition-all ${
          activeTab === 'rag'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        onClick={() => onTabChange('rag')}
        aria-label="Investigate with AI"
      >
        {React.createElement(MdChat as unknown as React.ElementType, {
          size: 28,
        })}
        <span className="sr-only">Investigate with AI</span>
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
        Investigate with AI
      </div>
    </div>
    <div className="relative group w-full flex justify-center">
      <button
        type="button"
        className={`flex flex-col items-center px-2 py-4 rounded-lg transition-colors duration-200 w-16 ${
          activeTab === 'settings'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        onClick={() => onTabChange('settings')}
        aria-label="Settings"
      >
        {React.createElement(MdSettings as unknown as React.ElementType, {
          size: 28,
        })}
        <span className="sr-only">Settings</span>
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
        Settings
      </div>
    </div>
  </aside>
);

export default NavigationBar;
