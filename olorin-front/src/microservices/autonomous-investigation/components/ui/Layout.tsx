import React from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { ErrorBoundary } from '../shared/ErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showNavigation = true,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-secondary-50 ${className}`}>
      <Header />
      
      <div className="flex">
        {showNavigation && (
          <aside className="w-64 bg-white border-r border-secondary-200 min-h-[calc(100vh-4rem)]">
            <Navigation />
          </aside>
        )}
        
        <main className={`flex-1 ${showNavigation ? 'ml-0' : ''}`}>
          <ErrorBoundary>
            <div className="p-6">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
