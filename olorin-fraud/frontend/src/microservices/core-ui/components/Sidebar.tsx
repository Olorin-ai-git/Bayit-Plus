import React from 'react';

export interface SidebarProps {
  children?: React.ReactNode;
  className?: string;
  isOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  children,
  className = '',
  isOpen = true
}) => {
  return (
    <aside className={`core-ui-sidebar w-64 min-h-screen ${!isOpen ? 'hidden' : ''} ${className}`}>
      <div className="p-4">
        <nav className="space-y-2">
          {children}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;