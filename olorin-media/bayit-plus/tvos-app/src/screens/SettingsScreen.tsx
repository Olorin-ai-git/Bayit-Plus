/**
 * SettingsScreen - App settings for TV
 *
 * Features:
 * - Voice settings (language, rate, wake word)
 * - Display settings (theme, safe zones)
 * - Multi-window preferences
 * - Account settings
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { Settings, Mic, Monitor, User, Info } from 'lucide-react-native';
import { TVHeader } from '../components/TVHeader';
import { useMultiWindowStore } from '../stores/multiWindowStore';
import { config } from '../config/appConfig';
import { logger } from '../utils/logger';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'select' | 'action';
  value?: boolean | string;
  options?: string[];
}

const SETTINGS_SECTIONS = [
  {
    title: 'Voice Settings',
    icon: Mic,
    items: [
      { id: 'voice_enabled', title: 'Voice Control', subtitle: 'Enable voice commands', type: 'toggle', value: true },
      { id: 'wake_word', title: 'Wake Word', subtitle: 'Optional wake word detection', type: 'toggle', value: false },
      { id: 'tts_rate', title: 'Speech Rate', subtitle: '0.9x (TV optimized)', type: 'select', value: '0.9x' },
    ],
  },
  {
    title: 'Display Settings',
    icon: Monitor,
    items: [
      { id: 'safe_zones', title: 'Safe Zones', subtitle: '60pt margins', type: 'toggle', value: true },
      { id: 'focus_scale', title: 'Focus Scale', subtitle: '1.1x magnification', type: 'select', value: '1.1x' },
    ],
  },
  {
    title: 'Multi-Window',
    icon: Settings,
    items: [
      { id: 'max_windows', title: 'Max Windows', subtitle: '4 concurrent windows', type: 'select', value: '4' },
      { id: 'layout', title: 'Default Layout', subtitle: 'Grid 2x2', type: 'select', value: 'Grid 2x2' },
    ],
  },
];

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const { layoutMode, setLayoutMode } = useMultiWindowStore();

  const handleToggle = (itemId: string, value: boolean) => {
    logger.info('Setting toggled', { module: 'SettingsScreen', itemId, value });
  };

  const renderSettingItem = (item: SettingItem, sectionIndex: number, itemIndex: number) => {
    const isFocused = focusedItem === item.id;
    const isFirstItem = sectionIndex === 0 && itemIndex === 0;

    return (
      <Pressable
        key={item.id}
        onFocus={() => setFocusedItem(item.id)}
        hasTVPreferredFocus={isFirstItem}
        accessible
        accessibilityLabel={`${item.title}: ${item.subtitle}`}
        style={styles.settingButton}
      >
        <View style={[styles.settingItem, isFocused && styles.settingItemFocused]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>

          {item.type === 'toggle' && (
            <Switch
              value={item.value as boolean}
              onValueChange={(value) => handleToggle(item.id, value)}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#A855F7' }}
              thumbColor="#ffffff"
            />
          )}

          {item.type === 'select' && (
            <Text style={styles.settingValue}>{item.value as string}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="settings" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.title}>Settings</Text>

        {SETTINGS_SECTIONS.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon size={32} color="#A855F7" />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>

              <View style={styles.sectionContent}>
                {section.items.map((item, itemIndex) =>
                  renderSettingItem(item, sectionIndex, itemIndex)
                )}
              </View>
            </View>
          );
        })}

        {/* App Info */}
        <View style={styles.infoSection}>
          <Info size={24} color="rgba(255,255,255,0.5)" />
          <Text style={styles.infoText}>Bayit+ for tvOS v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 32,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionContent: {
    gap: 12,
  },
  settingButton: {
    width: '100%',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  settingItemFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  settingInfo: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
  },
  settingSubtitle: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  settingValue: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#A855F7',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 40,
    paddingVertical: 20,
  },
  infoText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },
});
