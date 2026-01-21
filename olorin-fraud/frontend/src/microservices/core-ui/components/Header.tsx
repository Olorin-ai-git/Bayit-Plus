import React from 'react';

export interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title = 'Olorin Platform',
  children,
  className = ''
}) => {
  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            {children}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;