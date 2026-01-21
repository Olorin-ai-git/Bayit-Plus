/**
 * ResponsiveLayout Component
 *
 * A flexible responsive layout component that adapts to different screen sizes
 * and provides consistent layouts across all UI concepts with sidebar management,
 * panel arrangements, and mobile-first design.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React from 'react';
import { useResponsiveLayout, LayoutPanel } from './hooks/useResponsiveLayout';
import { LayoutRenderer } from './components/LayoutRenderer';
import { MobileMenu } from './components/MobileMenu';

export interface ResponsiveLayoutProps {
  /** Layout panels configuration */
  panels: LayoutPanel[];
  /** Main content area */
  children?: React.ReactNode;
  /** Layout variant */
  variant?: 'sidebar' | 'dashboard' | 'full-width' | 'split' | 'three-column';
  /** Enable mobile menu */
  showMobileMenu?: boolean;
  /** Enable panel resizing */
  enableResize?: boolean;
  /** Enable panel collapse */
  enableCollapse?: boolean;
  /** Sidebar position */
  sidebarPosition?: 'left' | 'right';
  /** Header content */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Mobile breakpoint */
  mobileBreakpoint?: number;
  /** Tablet breakpoint */
  tabletBreakpoint?: number;
  /** Panel gap spacing */
  gap?: 'none' | 'small' | 'medium' | 'large';
  /** Custom styling classes */
  className?: string;
  /** Callbacks */
  onPanelResize?: (panelId: string, width: number) => void;
  onPanelCollapse?: (panelId: string, collapsed: boolean) => void;
  onLayoutChange?: (layout: string) => void;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  panels,
  children,
  variant = 'dashboard',
  showMobileMenu = true,
  enableResize = true,
  enableCollapse = true,
  sidebarPosition = 'left',
  header,
  footer,
  mobileBreakpoint = 768,
  tabletBreakpoint = 1024,
  gap = 'medium',
  className = '',
  onPanelResize,
  onPanelCollapse,
  onLayoutChange,
}) => {
  const {
    screenSize,
    mobileMenuOpen,
    panelStates,
    togglePanelCollapse,
    handlePanelResize,
    getVisiblePanels,
    toggleMobileMenu,
    setMobileMenuOpen,
  } = useResponsiveLayout({
    panels,
    mobileBreakpoint,
    tabletBreakpoint,
    onPanelResize,
    onPanelCollapse,
    onLayoutChange,
  });

  const getGapClasses = () => {
    switch (gap) {
      case 'none': return 'gap-0';
      case 'small': return 'gap-2';
      case 'large': return 'gap-6';
      default: return 'gap-4';
    }
  };


  const renderPanel = (panel: LayoutPanel, index: number) => {
    const panelState = panelStates[panel.id] || { collapsed: false };
    const isCollapsed = panelState.collapsed;

    return (
      <div key={panel.id} className={`panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 truncate">{panel.title}</h3>
          {enableCollapse && panel.collapsible !== false && (
            <button
              onClick={() => togglePanelCollapse(panel.id)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              <span className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>▼</span>
            </button>
          )}
        </div>
        {!isCollapsed && <div className="panel-content overflow-hidden">{panel.content}</div>}
      </div>
    );
  };

  return (
    <div className={`responsive-layout h-screen flex flex-col ${className}`}>
      {header && <header className="flex-shrink-0 border-b border-gray-200">{header}</header>}

      <main className="flex-1 overflow-hidden">
        <LayoutRenderer
          panels={panels}
          screenSize={screenSize}
          panelStates={panelStates}
          variant={variant}
          sidebarPosition={sidebarPosition}
          gap={gap}
          enableResize={enableResize}
          enableCollapse={enableCollapse}
          onPanelCollapse={togglePanelCollapse}
          onPanelResize={handlePanelResize}
          getVisiblePanels={getVisiblePanels}
        >
          {children}
        </LayoutRenderer>
      </main>

      {footer && <footer className="flex-shrink-0 border-t border-gray-200">{footer}</footer>}

      {showMobileMenu && screenSize === 'mobile' && (
        <MobileMenu
          isOpen={mobileMenuOpen}
          panels={getVisiblePanels()}
          onToggle={toggleMobileMenu}
          onClose={() => setMobileMenuOpen(false)}
          renderPanel={renderPanel}
        />
      )}
    </div>
  );
};

export default ResponsiveLayout;