/**
 * SettingsScreen - App settings for TV
 *
 * Features:
 * - Voice settings (language, rate, wake word)
 * - Display settings (theme, safe zones)
 * - Multi-window preferences
 * - Account settings
 */

import React, { useState} from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet} from 'react-native';
import { useTranslation} from 'react-i18next';
import {
  Settings, Mic, Monitor, User, Info,
  Eye, Bell, Subtitles, Accessibility, ChevronRight,
} from 'lucide-react-native';
import { GlassTVSwitch} from '@bayit/glass';
import { TVHeader} from '../components/TVHeader';
import { useMultiWindowStore} from '../stores/multiWindowStore';
import { config} from '../config/appConfig';
import { logger} from '../utils/logger';
import { styles } from './styles/SettingsScreen.styles';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'select' | 'action';
  value?: boolean | string;
  options?: string[];
}

export const SettingsScreen: React.FC<{ navigation: any}> = ({ navigation}) => {
  const { t} = useTranslation();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const { layoutMode, setLayoutMode} = useMultiWindowStore();

  const settingsSections = [
    {
      title: t('tvos.settings.voiceSettings'),
      icon: Mic,
      items: [
        { id: 'voice_enabled', title: t('tvos.settings.voiceControl'), subtitle: t('tvos.settings.enableVoiceCommands'), type: 'toggle' as const, value: true},
        { id: 'wake_word', title: t('tvos.settings.wakeWord'), subtitle: t('tvos.settings.wakeWordSubtitle'), type: 'toggle' as const, value: false},
        { id: 'tts_rate', title: t('tvos.settings.speechRate'), subtitle: '0.9x', type: 'select' as const, value: '0.9x'},
      ],
    },
    {
      title: t('tvos.settings.displaySettings'),
      icon: Monitor,
      items: [
        { id: 'safe_zones', title: t('tvos.settings.safeZones'), subtitle: '60pt', type: 'toggle' as const, value: true},
        { id: 'focus_scale', title: t('tvos.settings.focusScale'), subtitle: '1.1x', type: 'select' as const, value: '1.1x'},
      ],
    },
    {
      title: t('tvos.settings.multiWindow'),
      icon: Settings,
      items: [
        { id: 'max_windows', title: t('tvos.settings.maxWindows'), subtitle: '4', type: 'select' as const, value: '4'},
        { id: 'layout', title: t('tvos.settings.defaultLayout'), subtitle: 'Grid 2x2', type: 'select' as const, value: 'Grid 2x2'},
      ],
    },
  ];

  const handleToggle = (itemId: string, value: boolean) => {
    logger.info('Setting toggled', { module: 'SettingsScreen', itemId, value});
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
            <GlassTVSwitch
              value={item.value as boolean}
              onValueChange={(value) => handleToggle(item.id, value)}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#A855F7'}}
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
        <Text style={styles.title}>{t('tvos.settings.title', 'Settings')}</Text>

        {settingsSections.map((section, sectionIndex) => {
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

        {/* Quick Access to Settings Sub-Screens */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings size={32} color="#A855F7" />
            <Text style={styles.sectionTitle}>{t('tvos.settings.moreSettings', 'More Settings')}</Text>
          </View>
          <View style={styles.sectionContent}>
            {[
              { id: 'nav_privacy', title: t('tvos.settings.privacy', 'Privacy & Data'), icon: Eye, route: 'PrivacySettings' },
              { id: 'nav_notifications', title: t('tvos.settings.notifications', 'Notifications'), icon: Bell, route: 'NotificationSettings' },
              { id: 'nav_subtitles', title: t('tvos.settings.subtitles', 'Subtitles'), icon: Subtitles, route: 'SubtitleSettings' },
              { id: 'nav_accessibility', title: t('tvos.settings.accessibility', 'Accessibility'), icon: Accessibility, route: 'AccessibilitySettings' },
            ].map((navItem) => {
              const NavIcon = navItem.icon;
              const isNavFocused = focusedItem === navItem.id;
              return (
                <Pressable
                  key={navItem.id}
                  onPress={() => navigation.navigate(navItem.route)}
                  onFocus={() => setFocusedItem(navItem.id)}
                  style={styles.settingButton}
                >
                  <View style={[styles.settingItem, isNavFocused && styles.settingItemFocused]}>
                    <NavIcon size={28} color="#A855F7" style={{ marginRight: 16 }} />
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingTitle}>{navItem.title}</Text>
                    </View>
                    <ChevronRight size={24} color="rgba(255,255,255,0.5)" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.infoSection}>
          <Info size={24} color="rgba(255,255,255,0.5)" />
          <Text style={styles.infoText}>{t('tvos.settings.appInfo', 'Bayit+ for tvOS v1.0.0')}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

