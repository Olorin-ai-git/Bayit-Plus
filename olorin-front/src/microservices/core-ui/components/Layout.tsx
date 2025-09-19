import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Navigation from './Navigation';

export interface LayoutProps {
  children?: React.ReactNode;
  title?: string;
  showSidebar?: boolean;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  showSidebar = false,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <Navigation />
      <Header title={title} />
      <div className="flex">
        {showSidebar && <Sidebar />}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;