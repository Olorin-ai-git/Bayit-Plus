/**
 * PrivacySettingsScreen - Privacy and data management for tvOS
 *
 * Features:
 * - Analytics, crash reports, personalization toggles
 * - Watch/search history management with clear actions
 * - GDPR data export and delete all data
 * - Real backend integration with optimistic updates
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BarChart3, AlertTriangle, Sparkles, Clock, Search, Download, Trash2 } from 'lucide-react-native';
import { TVHeader } from '../components/TVHeader';
import { SettingRow } from '../components/profile/SettingRow';
import { SettingAction } from '../components/profile/SettingAction';
import { usePrivacySettingsStore } from '../stores/privacySettingsStore';
import { settingsSharedStyles as styles } from './styles/settingsShared.styles';

export const PrivacySettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const {
    settings, isLoading, error, loadSettings,
    updateSetting, clearWatchHistory, clearSearchHistory,
    requestDataExport, requestDeleteAllData,
  } = usePrivacySettingsStore();

  useEffect(() => { loadSettings(); }, [loadSettings]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="profile" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="profile" navigation={navigation} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>{t('common.retry', 'Please try again')}</Text>
        </View>
      </View>
    );
  }

  if (!settings) return null;

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="profile" navigation={navigation} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.screenTitle}>{t('tvos.privacy.title', 'Privacy & Data')}</Text>

        <Text style={styles.sectionTitle}>{t('tvos.privacy.dataCollection', 'Data Collection')}</Text>
        <View style={styles.section}>
          <SettingRow icon={BarChart3} label={t('tvos.privacy.analytics', 'Analytics')}
            description={t('tvos.privacy.analyticsDesc', 'Help improve Bayit+ with usage data')}
            type="toggle" value={settings.analyticsEnabled}
            onChange={(val) => updateSetting('analyticsEnabled', val)}
            isFocused={focusedItem === 'analytics'} onFocus={() => setFocusedItem('analytics')}
            hasTVPreferredFocus={true} />
          <SettingRow icon={AlertTriangle} label={t('tvos.privacy.crashReports', 'Crash Reports')}
            description={t('tvos.privacy.crashReportsDesc', 'Send crash data to help fix issues')}
            type="toggle" value={settings.crashReportsEnabled}
            onChange={(val) => updateSetting('crashReportsEnabled', val)}
            isFocused={focusedItem === 'crash'} onFocus={() => setFocusedItem('crash')} />
          <SettingRow icon={Sparkles} label={t('tvos.privacy.personalization', 'Personalization')}
            description={t('tvos.privacy.personalizationDesc', 'Personalized content recommendations')}
            type="toggle" value={settings.personalizationEnabled}
            onChange={(val) => updateSetting('personalizationEnabled', val)}
            isFocused={focusedItem === 'personal'} onFocus={() => setFocusedItem('personal')} />
        </View>

        <Text style={styles.sectionTitle}>{t('tvos.privacy.historyManagement', 'History')}</Text>
        <View style={styles.section}>
          <SettingRow icon={Clock} label={t('tvos.privacy.watchHistory', 'Watch History')}
            description={t('tvos.privacy.watchHistoryDesc', 'Track your viewing history')}
            type="toggle" value={settings.watchHistoryEnabled}
            onChange={(val) => updateSetting('watchHistoryEnabled', val)}
            isFocused={focusedItem === 'watchHistory'} onFocus={() => setFocusedItem('watchHistory')} />
          <SettingAction icon={Trash2}
            label={t('tvos.privacy.clearWatchHistory', 'Clear Watch History')}
            description={t('tvos.privacy.clearWatchHistoryDesc', 'Remove all watched content records')}
            onPress={clearWatchHistory}
            isFocused={focusedItem === 'clearWatch'} onFocus={() => setFocusedItem('clearWatch')} />
          <SettingRow icon={Search} label={t('tvos.privacy.searchHistory', 'Search History')}
            description={t('tvos.privacy.searchHistoryDesc', 'Track your search queries')}
            type="toggle" value={settings.searchHistoryEnabled}
            onChange={(val) => updateSetting('searchHistoryEnabled', val)}
            isFocused={focusedItem === 'searchHistory'} onFocus={() => setFocusedItem('searchHistory')} />
          <SettingAction icon={Trash2}
            label={t('tvos.privacy.clearSearchHistory', 'Clear Search History')}
            description={t('tvos.privacy.clearSearchHistoryDesc', 'Remove all search query records')}
            onPress={clearSearchHistory}
            isFocused={focusedItem === 'clearSearch'} onFocus={() => setFocusedItem('clearSearch')} />
        </View>

        <Text style={styles.sectionTitle}>{t('tvos.privacy.gdprActions', 'Your Data Rights')}</Text>
        <View style={styles.section}>
          <SettingAction icon={Download}
            label={t('tvos.privacy.exportData', 'Export My Data')}
            description={t('tvos.privacy.exportDataDesc', 'Download a copy of all your data')}
            onPress={requestDataExport}
            isFocused={focusedItem === 'export'} onFocus={() => setFocusedItem('export')} />
          <SettingAction icon={Trash2}
            label={t('tvos.privacy.deleteAllData', 'Delete All Data')}
            description={t('tvos.privacy.deleteAllDataDesc', 'Permanently delete all your account data')}
            onPress={requestDeleteAllData} variant="danger"
            isFocused={focusedItem === 'deleteAll'} onFocus={() => setFocusedItem('deleteAll')} />
        </View>
      </ScrollView>
    </View>
  );
};
