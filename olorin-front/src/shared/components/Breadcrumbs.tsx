import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string;
}

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();

  // Helper function to format path segments into readable labels
  const formatLabel = (segment: string): string => {
    if (!segment) return 'Home';
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Generate breadcrumb items from current path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(x => x);
    
    if (pathnames.length === 0) {
      return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', icon: '🏠' }
    ];

    let currentPath = '';
    pathnames.forEach((name, index) => {
      currentPath += `/${name}`;
      breadcrumbs.push({
        label: formatLabel(name),
        path: currentPath,
        icon: index === 0 ? '📋' : undefined // Add icon for service level
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="bg-black/40 backdrop-blur border-b border-corporate-borderPrimary/30 sticky top-24 z-40">
      <div className="max-w-full mx-auto px-6 lg:px-8 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={item.path}>
              {index > 0 && (
                <ChevronRightIcon className="w-4 h-4 text-corporate-textTertiary flex-shrink-0" />
              )}
              {index === breadcrumbs.length - 1 ? (
                // Current page - not a link
                <div className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-corporate-accentSecondary whitespace-nowrap">
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              ) : (
                // Previous pages - clickable links
                <Link
                  to={item.path}
                  className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-corporate-textSecondary hover:text-corporate-accentSecondary transition-colors duration-200 whitespace-nowrap hover:bg-black/30 rounded"
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Breadcrumbs;
