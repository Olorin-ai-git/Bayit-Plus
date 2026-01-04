/**
 * Responsive Layout Hook
 *
 * Custom hook for managing responsive layout state and screen size detection.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import { useCallback, useEffect, useState } from 'react';

export interface LayoutPanel {
  id: string;
  title: string;
  content: React.ReactNode;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  resizable?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  position?: 'left' | 'right' | 'center';
  priority?: number;
  mobileHidden?: boolean;
}

export interface UseResponsiveLayoutProps {
  panels: LayoutPanel[];
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  onPanelResize?: (panelId: string, width: number) => void;
  onPanelCollapse?: (panelId: string, collapsed: boolean) => void;
  onLayoutChange?: (layout: string) => void;
}

export const useResponsiveLayout = ({
  panels,
  mobileBreakpoint = 768,
  tabletBreakpoint = 1024,
  onPanelResize,
  onPanelCollapse,
  onLayoutChange,
}: UseResponsiveLayoutProps) => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [panelStates, setPanelStates] = useState<Record<string, { collapsed: boolean; width?: number }>>({});

  // Screen size detection
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < mobileBreakpoint) {
        setScreenSize('mobile');
        setMobileMenuOpen(false);
      } else if (width < tabletBreakpoint) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [mobileBreakpoint, tabletBreakpoint]);

  // Initialize panel states
  useEffect(() => {
    const initialStates: Record<string, { collapsed: boolean; width?: number }> = {};
    panels.forEach(panel => {
      initialStates[panel.id] = {
        collapsed: panel.collapsed || false,
        width: typeof panel.width === 'number' ? panel.width : undefined,
      };
    });
    setPanelStates(initialStates);
  }, [panels]);

  // Notify layout changes
  useEffect(() => {
    onLayoutChange?.(screenSize);
  }, [screenSize, onLayoutChange]);

  const togglePanelCollapse = useCallback((panelId: string) => {
    setPanelStates(prev => {
      const newCollapsed = !prev[panelId]?.collapsed;
      const newStates = {
        ...prev,
        [panelId]: { ...prev[panelId], collapsed: newCollapsed },
      };
      onPanelCollapse?.(panelId, newCollapsed);
      return newStates;
    });
  }, [onPanelCollapse]);

  const handlePanelResize = useCallback((panelId: string, width: number) => {
    setPanelStates(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], width },
    }));
    onPanelResize?.(panelId, width);
  }, [onPanelResize]);

  const getVisiblePanels = useCallback(() => {
    let visiblePanels = panels.filter(panel => {
      if (screenSize === 'mobile' && panel.mobileHidden) return false;
      return true;
    });

    // Sort by priority for mobile layout
    if (screenSize === 'mobile') {
      visiblePanels = visiblePanels.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    return visiblePanels;
  }, [panels, screenSize]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  return {
    screenSize,
    mobileMenuOpen,
    panelStates,
    togglePanelCollapse,
    handlePanelResize,
    getVisiblePanels,
    toggleMobileMenu,
    setMobileMenuOpen,
  };
};