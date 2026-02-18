/**
 * NotificationSettingsScreen - Notification preferences for tvOS
 *
 * Features:
 * - Push notification master toggle and category controls
 * - Content alerts (new content, live TV, recommendations)
 * - Marketing (promotions, credits alerts)
 * - Digest settings (weekly, email)
 * - Real backend integration with optimistic updates
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Bell, BellRing, Tv, Sparkles, Tag,
  Coins, CalendarDays, Mail,
} from 'lucide-react-native';
import { TVHeader } from '../components/TVHeader';
import { SettingRow } from '../components/profile/SettingRow';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';
import { settingsSharedStyles as styles } from './styles/settingsShared.styles';
import type { EmailDigestFrequency } from '@bayit/shared-types';

export const NotificationSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const {
    settings,
    isLoading,
    error,
    loadSettings,
    updateSetting,
  } = useNotificationSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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

  const digestFrequencyOptions: Array<{ label: string; value: EmailDigestFrequency }> = [
    { label: t('tvos.notifications.daily', 'Daily'), value: 'daily' },
    { label: t('tvos.notifications.weekly', 'Weekly'), value: 'weekly' },
    { label: t('tvos.notifications.monthly', 'Monthly'), value: 'monthly' },
    { label: t('tvos.notifications.never', 'Never'), value: 'never' },
  ];

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="profile" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.screenTitle}>
          {t('tvos.notifications.title', 'Notifications')}
        </Text>

        {/* Master Toggle Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.notifications.pushNotifications', 'Push Notifications')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon={Bell}
            label={t('tvos.notifications.enablePush', 'Enable Notifications')}
            description={t('tvos.notifications.enablePushDesc', 'Receive push notifications')}
            type="toggle"
            value={settings.pushEnabled}
            onChange={(val) => updateSetting('pushEnabled', val)}
            isFocused={focusedItem === 'push'}
            onFocus={() => setFocusedItem('push')}
            hasTVPreferredFocus={true}
          />
        </View>

        {/* Content Alerts Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.notifications.contentAlerts', 'Content Alerts')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon={BellRing}
            label={t('tvos.notifications.newContent', 'New Content')}
            description={t('tvos.notifications.newContentDesc', 'When new shows or movies are added')}
            type="toggle"
            value={settings.newContent}
            onChange={(val) => updateSetting('newContent', val)}
            isFocused={focusedItem === 'newContent'}
            onFocus={() => setFocusedItem('newContent')}
          />
          <SettingRow
            icon={Tv}
            label={t('tvos.notifications.liveTv', 'Live TV Alerts')}
            description={t('tvos.notifications.liveTvDesc', 'Alerts for live broadcasts and events')}
            type="toggle"
            value={settings.liveTvAlerts}
            onChange={(val) => updateSetting('liveTvAlerts', val)}
            isFocused={focusedItem === 'liveTv'}
            onFocus={() => setFocusedItem('liveTv')}
          />
          <SettingRow
            icon={Sparkles}
            label={t('tvos.notifications.recommendations', 'Recommendations')}
            description={t('tvos.notifications.recommendationsDesc', 'Personalized content suggestions')}
            type="toggle"
            value={settings.recommendations}
            onChange={(val) => updateSetting('recommendations', val)}
            isFocused={focusedItem === 'recommendations'}
            onFocus={() => setFocusedItem('recommendations')}
          />
        </View>

        {/* Marketing Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.notifications.marketing', 'Marketing & Promotions')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon={Tag}
            label={t('tvos.notifications.promotions', 'Promotions')}
            description={t('tvos.notifications.promotionsDesc', 'Special offers and deals')}
            type="toggle"
            value={settings.promotions}
            onChange={(val) => updateSetting('promotions', val)}
            isFocused={focusedItem === 'promotions'}
            onFocus={() => setFocusedItem('promotions')}
          />
          <SettingRow
            icon={Coins}
            label={t('tvos.notifications.credits', 'Credits Alerts')}
            description={t('tvos.notifications.creditsDesc', 'Beta 500 credit balance updates')}
            type="toggle"
            value={settings.creditsAlerts}
            onChange={(val) => updateSetting('creditsAlerts', val)}
            isFocused={focusedItem === 'credits'}
            onFocus={() => setFocusedItem('credits')}
          />
        </View>

        {/* Digest Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.notifications.digestSettings', 'Email Digest')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon={CalendarDays}
            label={t('tvos.notifications.weeklyDigest', 'Weekly Digest')}
            description={t('tvos.notifications.weeklyDigestDesc', 'Weekly content summary')}
            type="toggle"
            value={settings.weeklyDigest}
            onChange={(val) => updateSetting('weeklyDigest', val)}
            isFocused={focusedItem === 'weeklyDigest'}
            onFocus={() => setFocusedItem('weeklyDigest')}
          />
          <SettingRow
            icon={Mail}
            label={t('tvos.notifications.emailDigest', 'Email Digest')}
            description={t('tvos.notifications.emailDigestDesc', 'Frequency of email summaries')}
            type="select"
            value={settings.emailDigestFrequency}
            options={digestFrequencyOptions}
            onChange={(val) => updateSetting('emailDigestFrequency', val)}
            isFocused={focusedItem === 'emailDigest'}
            onFocus={() => setFocusedItem('emailDigest')}
          />
        </View>
      </ScrollView>
    </View>
  );
};
