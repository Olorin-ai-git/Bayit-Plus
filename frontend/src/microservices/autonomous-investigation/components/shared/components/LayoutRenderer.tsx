/**
 * Layout Renderer Component
 *
 * Renders the main layout structure for ResponsiveLayout component.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React from 'react';
import { LayoutPanel } from '../hooks/useResponsiveLayout';

export interface LayoutRendererProps {
  panels: LayoutPanel[];
  screenSize: 'mobile' | 'tablet' | 'desktop';
  panelStates: Record<string, { collapsed: boolean; width?: number }>;
  variant: 'sidebar' | 'dashboard' | 'full-width' | 'split' | 'three-column';
  sidebarPosition: 'left' | 'right';
  gap: 'none' | 'small' | 'medium' | 'large';
  enableResize: boolean;
  enableCollapse: boolean;
  children?: React.ReactNode;
  onPanelCollapse: (panelId: string) => void;
  onPanelResize: (panelId: string, width: number) => void;
  getVisiblePanels: () => LayoutPanel[];
}

export const LayoutRenderer: React.FC<LayoutRendererProps> = ({
  panels,
  screenSize,
  panelStates,
  variant,
  sidebarPosition,
  gap,
  enableResize,
  enableCollapse,
  children,
  onPanelCollapse,
  onPanelResize,
  getVisiblePanels,
}) => {
  const getGapClasses = () => {
    switch (gap) {
      case 'none': return 'gap-0';
      case 'small': return 'gap-2';
      case 'large': return 'gap-6';
      default: return 'gap-4';
    }
  };

  const getLayoutClasses = () => {
    if (screenSize === 'mobile') {
      return 'flex flex-col';
    }

    switch (variant) {
      case 'sidebar':
        return `flex ${sidebarPosition === 'left' ? 'flex-row' : 'flex-row-reverse'}`;
      case 'full-width':
        return 'w-full';
      case 'split':
        return 'grid grid-cols-2';
      case 'three-column':
        return 'grid grid-cols-3';
      default: // dashboard
        return 'flex flex-col lg:flex-row';
    }
  };

  const renderPanel = (panel: LayoutPanel, index: number) => {
    const panelState = panelStates[panel.id] || { collapsed: false };
    const isCollapsed = panelState.collapsed;

    const getPanelWidthStyle = () => {
      if (screenSize === 'mobile') return {};

      const width = panelState.width || panel.width;
      if (width) {
        return {
          width: typeof width === 'number' ? `${width}px` : width,
          minWidth: panel.minWidth,
          maxWidth: panel.maxWidth,
        };
      }
      return {
        minWidth: panel.minWidth,
        maxWidth: panel.maxWidth,
      };
    };

    return (
      <div
        key={panel.id}
        className={`panel ${isCollapsed ? 'collapsed' : ''} ${
          screenSize === 'mobile' ? 'w-full' : 'flex-shrink-0'
        }`}
        style={getPanelWidthStyle()}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 truncate">{panel.title}</h3>
          {enableCollapse && panel.collapsible !== false && (
            <button
              onClick={() => onPanelCollapse(panel.id)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              <span className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          )}
        </div>

        {/* Panel Content */}
        {!isCollapsed && (
          <div className="panel-content overflow-hidden">
            {panel.content}
          </div>
        )}

        {/* Resize Handle */}
        {enableResize && panel.resizable !== false && screenSize !== 'mobile' && !isCollapsed && (
          <div
            className="resize-handle absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-300 opacity-0 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => {
              e.preventDefault();
              // Resize logic would be implemented here
            }}
          />
        )}
      </div>
    );
  };

  const renderDesktopLayout = () => {
    const visiblePanels = getVisiblePanels();
    const leftPanels = visiblePanels.filter(p => p.position === 'left');
    const rightPanels = visiblePanels.filter(p => p.position === 'right');
    const centerPanels = visiblePanels.filter(p => !p.position || p.position === 'center');

    return (
      <div className={`flex ${getGapClasses()} h-full`}>
        {/* Left Panels */}
        {leftPanels.length > 0 && (
          <div className={`flex flex-col ${getGapClasses()}`}>
            {leftPanels.map((panel, index) => renderPanel(panel, index))}
          </div>
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {centerPanels.length > 0 && (
            <div className={`flex ${getGapClasses()} mb-4`}>
              {centerPanels.map((panel, index) => renderPanel(panel, index))}
            </div>
          )}
          {children && (
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          )}
        </div>

        {/* Right Panels */}
        {rightPanels.length > 0 && (
          <div className={`flex flex-col ${getGapClasses()}`}>
            {rightPanels.map((panel, index) => renderPanel(panel, index))}
          </div>
        )}
      </div>
    );
  };

  const renderMobileLayout = () => {
    return (
      <div className="flex flex-col h-full">
        {children && (
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  return screenSize === 'mobile' ? renderMobileLayout() : renderDesktopLayout();
};