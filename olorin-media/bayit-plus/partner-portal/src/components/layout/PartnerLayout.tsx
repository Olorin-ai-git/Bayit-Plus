/**
 * Partner Layout Component
 *
 * Main layout for authenticated partner portal pages.
 */

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useB2BAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const PartnerLayout: React.FC = () => {
  const { fetchCurrentUser, isLoading } = useB2BAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  // Fetch current user data on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Handle mobile sidebar backdrop click
  const handleBackdropClick = () => {
    setSidebarOpen(false);
  };

  // Close sidebar on mobile when route changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-glass-bg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-glass-bg flex">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 rtl:left-auto rtl:right-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PartnerLayout;
