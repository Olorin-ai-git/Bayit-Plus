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
  ScrollView,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView, GlassButton } from '@bayit/shared';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { spacing, colors, typography, touchTarget } from '@olorin/design-tokens';

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
  const notifications = useNotifications();

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
      notifications.show({
        level: 'info',
        title: t('notifications.enableTitle'),
        message: t('notifications.enableMessage'),
        action: {
          label: t('settings.openSettings'),
          type: 'action',
          onPress: () => {
            Linking.openSettings();
          },
        },
        dismissable: true,
      });
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
    <ScrollView className="flex-1 bg-[#1a1525]" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl * 2 }}>
      {/* Header */}
      <View className="mb-6">
        <Text className="text-4xl font-bold text-white mb-1">{t('settings.notifications')}</Text>
        <Text className="text-base text-white/60">{t('notifications.subtitle')}</Text>
      </View>

      {/* Master Notifications Toggle */}
      <GlassView className="flex-row items-center justify-between py-6 px-6 rounded-xl mb-6">
        <View className="flex-1 mr-4">
          <Text className="text-[17px] text-white font-semibold mb-1">
            {t('notifications.masterToggle')}
          </Text>
          <Text className="text-sm text-white/60">
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
      <View className="mb-6">
        <Text className="text-sm text-white/60 uppercase font-semibold mb-2 px-1">{t('notifications.content')}</Text>
        {categorizedSettings.content.map((setting) => (
          <GlassView key={setting.id} className="flex-row items-center justify-between py-4 px-6 rounded-xl mb-2 min-h-[48px]">
            <View className="flex-1 mr-4">
              <Text className="text-[15px] text-white font-medium mb-1">{setting.title}</Text>
              <Text className="text-xs text-white/60 leading-4">{setting.description}</Text>
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
      <View className="mb-6">
        <Text className="text-sm text-white/60 uppercase font-semibold mb-2 px-1">{t('notifications.social')}</Text>
        {categorizedSettings.social.map((setting) => (
          <GlassView key={setting.id} className="flex-row items-center justify-between py-4 px-6 rounded-xl mb-2 min-h-[48px]">
            <View className="flex-1 mr-4">
              <Text className="text-[15px] text-white font-medium mb-1">{setting.title}</Text>
              <Text className="text-xs text-white/60 leading-4">{setting.description}</Text>
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
      <View className="mb-6">
        <Text className="text-sm text-white/60 uppercase font-semibold mb-2 px-1">{t('notifications.system')}</Text>
        {categorizedSettings.system.map((setting) => (
          <GlassView key={setting.id} className="flex-row items-center justify-between py-4 px-6 rounded-xl mb-2 min-h-[48px]">
            <View className="flex-1 mr-4">
              <Text className="text-[15px] text-white font-medium mb-1">{setting.title}</Text>
              <Text className="text-xs text-white/60 leading-4">{setting.description}</Text>
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
      <View className="mt-6">
        <GlassButton
          variant="secondary"
          onPress={() => {
            if (Platform.OS === 'ios') {
              ReactNativeHapticFeedback.trigger('impactLight');
            }
            Linking.openSettings();
          }}
          className="w-full"
        >
          {t('settings.openSystemSettings')}
        </GlassButton>
      </View>
    </ScrollView>
  );
};

export default NotificationSettingsScreen;
