import React from 'react';

export interface NavigationProps {
  children?: React.ReactNode;
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ children, className = '' }) => {
  return (
    <nav className={`core-ui-navigation ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">Olorin</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {children}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;