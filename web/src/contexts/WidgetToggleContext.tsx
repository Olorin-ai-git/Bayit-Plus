/**
 * WidgetToggleContext - Provides widget toggle state to deeply nested components.
 *
 * Wrap content areas with <WidgetToggleProvider> to allow any descendant
 * WidgetToggleButton to check and toggle widget state without prop drilling.
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import useWidgetToggle from '@/hooks/useWidgetToggle';

interface ContentItem {
  content_type: string;
  content_id: string;
}

interface ToggleParams {
  content_type: string;
  content_id: string;
  title: string;
  description?: string;
  icon?: string;
  cover_url?: string;
}

interface WidgetToggleContextValue {
  isWidget: (contentType: string, contentId: string) => boolean;
  toggleWidget: (params: ToggleParams) => Promise<void>;
  isLoading: boolean;
}

const WidgetToggleCtx = createContext<WidgetToggleContextValue | null>(null);

interface WidgetToggleProviderProps {
  items: ContentItem[];
  children: ReactNode;
}

export function WidgetToggleProvider({
  items,
  children,
}: WidgetToggleProviderProps) {
  const { widgetStates, toggle, isLoading } = useWidgetToggle(items);

  const value = useMemo<WidgetToggleContextValue>(
    () => ({
      isWidget: (contentType: string, contentId: string) => {
        return widgetStates.get(`${contentType}:${contentId}`) || false;
      },
      toggleWidget: async (params: ToggleParams) => {
        await toggle(params);
      },
      isLoading,
    }),
    [widgetStates, toggle, isLoading]
  );

  return (
    <WidgetToggleCtx.Provider value={value}>
      {children}
    </WidgetToggleCtx.Provider>
  );
}

export function useWidgetToggleContext(): WidgetToggleContextValue | null {
  return useContext(WidgetToggleCtx);
}
