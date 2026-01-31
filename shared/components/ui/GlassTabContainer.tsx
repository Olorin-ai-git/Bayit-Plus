/**
 * GlassTabContainer Component
 *
 * Wraps GlassTabs (tab bar) with a content panel renderer.
 * Supports controlled and uncontrolled modes.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { GlassTabs } from './GlassTabs';
import { spacing } from '@olorin/design-tokens';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

type TabVariant = 'default' | 'pills' | 'underline';

export interface TabContent {
  tabId: string;
  render: () => React.ReactNode;
}

export interface GlassTabContainerProps {
  tabs: Tab[];
  content: TabContent[];
  variant?: TabVariant;
  activeTab?: string;
  defaultActiveTab?: string;
  onTabChange?: (tabId: string) => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export const GlassTabContainer: React.FC<GlassTabContainerProps> = ({
  tabs,
  content,
  variant = 'underline',
  activeTab: controlledActiveTab,
  defaultActiveTab,
  onTabChange,
  style,
  contentStyle,
}) => {
  const isControlled = controlledActiveTab !== undefined;
  const initialTab = defaultActiveTab || tabs[0]?.id || '';
  const [internalActiveTab, setInternalActiveTab] = useState(initialTab);

  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (!isControlled) {
        setInternalActiveTab(tabId);
      }
      onTabChange?.(tabId);
    },
    [isControlled, onTabChange],
  );

  const activeContent = content.find((c) => c.tabId === activeTab);

  return (
    <View style={[styles.container, style]}>
      <GlassTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        variant={variant}
      />
      <View style={[styles.contentPanel, contentStyle]}>
        {activeContent?.render()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentPanel: {
    marginTop: spacing.md,
  },
});

export default GlassTabContainer;
