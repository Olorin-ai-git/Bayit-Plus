/**
 * GlassTabContainer Component
 *
 * Wraps GlassTabs (tab bar) with a content panel renderer.
 * Supports controlled and uncontrolled modes.
 */

import React, { useState, useCallback } from 'react';
import { View, type ViewStyle } from 'react-native';
import { GlassTabs, type Tab, type TabVariant } from './GlassTabs';

export interface TabContent {
  /** Tab ID matching a Tab.id */
  tabId: string;
  /** Render function for this tab's content */
  render: () => React.ReactNode;
}

export interface GlassTabContainerProps {
  /** Tab definitions passed through to GlassTabs */
  tabs: Tab[];
  /** Content panels mapped by tabId */
  content: TabContent[];
  /** Visual variant for the tab bar */
  variant?: TabVariant;
  /** Controlled active tab */
  activeTab?: string;
  /** Default active tab for uncontrolled mode */
  defaultActiveTab?: string;
  /** Tab change callback */
  onTabChange?: (tabId: string) => void;
  /** Container style */
  style?: ViewStyle;
  /** Content panel style */
  contentStyle?: ViewStyle;
  /** Test ID */
  testID?: string;
}

/**
 * Tab container combining GlassTabs bar with content panel rendering.
 * Supports both controlled (activeTab prop) and uncontrolled (defaultActiveTab) modes.
 */
export const GlassTabContainer: React.FC<GlassTabContainerProps> = ({
  tabs,
  content,
  variant = 'underline',
  activeTab: controlledActiveTab,
  defaultActiveTab,
  onTabChange,
  style,
  contentStyle,
  testID,
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
    <View style={style} testID={testID}>
      <GlassTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        variant={variant}
      />
      <View style={contentStyle}>
        {activeContent?.render()}
      </View>
    </View>
  );
};

export default GlassTabContainer;
