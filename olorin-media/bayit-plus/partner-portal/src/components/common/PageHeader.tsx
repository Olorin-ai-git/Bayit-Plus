/**
 * Page Header Component
 *
 * Consistent header layout for pages with title, description, and actions.
 */

import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.label}>
              {index > 0 && <span className="text-white/30">/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-white/80">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-white/60">{description}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
