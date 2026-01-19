/**
 * NotificationSettingsScreen
 *
 * Notification preferences and management
 * Features:
 * - Enable/disable notifications
 * - New content notifications
 * - Live stream alerts
 * - Morning ritual reminders
 * - Zmanim notifications
 * - Watch party invitations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView, GlassButton } from '@bayit/shared';
import { spacing, colors, typography, touchTarget } from '../theme';

type NotificationSetting = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  category: 'content' | 'social' | 'system';
};

export const NotificationSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  // Notification settings state
  const [masterNotifications, setMasterNotifications] = useState(true);
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'newContent',
      title: t('notifications.newContent'),
      description: t('notifications.newContentDescription'),
      enabled: true,
      category: 'content',
    },
    {
      id: 'liveStreams',
      title: t('notifications.liveStreams'),
      description: t('notifications.liveStreamsDescription'),
      enabled: true,
      category: 'content',
    },
    {
      id: 'morningRitual',
      title: t('notifications.morningRitual'),
      description: t('notifications.morningRitualDescription'),
      enabled: true,
      category: 'system',
    },
    {
      id: 'zmanim',
      title: t('notifications.zmanim'),
      description: t('notifications.zmanimDescription'),
      enabled: false,
      category: 'system',
    },
    {
      id: 'watchParty',
      title: t('notifications.watchParty'),
      description: t('notifications.watchPartyDescription'),
      enabled: true,
      category: 'social',
    },
    {
      id: 'recommendations',
      title: t('notifications.recommendations'),
      description: t('notifications.recommendationsDescription'),
      enabled: false,
      category: 'content',
    },
    {
      id: 'downloads',
      title: t('notifications.downloads'),
      description: t('notifications.downloadsDescription'),
      enabled: true,
      category: 'system',
    },
  ]);

  const handleMasterToggle = async (value: boolean) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selection');
    }

    if (value && !masterNotifications) {
      // Request permissions if enabling
      Alert.alert(
        t('notifications.enableTitle'),
        t('notifications.enableMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.openSettings'),
            onPress: () => {
              Linking.openSettings();
            },
          },
        ]
      );
    }

    setMasterNotifications(value);
  };

  const handleToggle = (settingId: string, value: boolean) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selection');
    }

    setSettings((prev) =>
      prev.map((setting) =>
        setting.id === settingId ? { ...setting, enabled: value } : setting
      )
    );
  };

  const categorizedSettings = {
    content: settings.filter((s) => s.category === 'content'),
    social: settings.filter((s) => s.category === 'social'),
    system: settings.filter((s) => s.category === 'system'),
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.notifications')}</Text>
        <Text style={styles.subtitle}>{t('notifications.subtitle')}</Text>
      </View>

      {/* Master Notifications Toggle */}
      <GlassView style={styles.masterToggle}>
        <View style={styles.masterToggleLeft}>
          <Text style={styles.masterToggleTitle}>
            {t('notifications.masterToggle')}
          </Text>
          <Text style={styles.masterToggleDescription}>
            {t('notifications.masterToggleDescription')}
          </Text>
        </View>
        <Switch
          value={masterNotifications}
          onValueChange={handleMasterToggle}
          trackColor={{ false: colors.backgroundElevated, true: colors.primary }}
          thumbColor={colors.text}
        />
      </GlassView>

      {/* Content Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notifications.content')}</Text>
        {categorizedSettings.content.map((setting) => (
          <GlassView key={setting.id} style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemTitle}>{setting.title}</Text>
              <Text style={styles.itemDescription}>{setting.description}</Text>
            </View>
            <Switch
              value={setting.enabled && masterNotifications}
              onValueChange={(value) => handleToggle(setting.id, value)}
              disabled={!masterNotifications}
              trackColor={{ false: colors.backgroundElevated, true: colors.primary }}
              thumbColor={colors.text}
            />
          </GlassView>
        ))}
      </View>

      {/* Social Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notifications.social')}</Text>
        {categorizedSettings.social.map((setting) => (
          <GlassView key={setting.id} style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemTitle}>{setting.title}</Text>
              <Text style={styles.itemDescription}>{setting.description}</Text>
            </View>
            <Switch
              value={setting.enabled && masterNotifications}
              onValueChange={(value) => handleToggle(setting.id, value)}
              disabled={!masterNotifications}
              trackColor={{ false: colors.backgroundElevated, true: colors.primary }}
              thumbColor={colors.text}
            />
          </GlassView>
        ))}
      </View>

      {/* System Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notifications.system')}</Text>
        {categorizedSettings.system.map((setting) => (
          <GlassView key={setting.id} style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemTitle}>{setting.title}</Text>
              <Text style={styles.itemDescription}>{setting.description}</Text>
            </View>
            <Switch
              value={setting.enabled && masterNotifications}
              onValueChange={(value) => handleToggle(setting.id, value)}
              disabled={!masterNotifications}
              trackColor={{ false: colors.backgroundElevated, true: colors.primary }}
              thumbColor={colors.text}
            />
          </GlassView>
        ))}
      </View>

      {/* System Settings Button */}
      <View style={styles.footer}>
        <GlassButton
          variant="secondary"
          onPress={() => {
            if (Platform.OS === 'ios') {
              ReactNativeHapticFeedback.trigger('impactLight');
            }
            Linking.openSettings();
          }}
          style={styles.systemButton}
        >
          {t('settings.openSystemSettings')}
        </GlassButton>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  masterToggleLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  masterToggleTitle: {
    ...typography.body,
    fontSize: 17,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  masterToggleDescription: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  itemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemTitle: {
    ...typography.body,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDescription: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  footer: {
    marginTop: spacing.lg,
  },
  systemButton: {
    width: '100%',
  },
});

export default NotificationSettingsScreen;
