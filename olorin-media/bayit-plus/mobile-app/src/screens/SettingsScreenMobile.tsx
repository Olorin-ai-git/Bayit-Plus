/**
 * SettingsScreenMobile
 *
 * Main settings screen for mobile app
 * Features:
 * - Language selection
 * - Notification preferences
 * - Voice settings
 * - Account management
 * - App information
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView, GlassButton } from '@bayit/shared';
import { GlassToggle } from '@olorin/glass-ui';
import { useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { spacing, colors, typography, touchTarget } from '@olorin/design-tokens';
import { useScaledFontSize } from '../hooks/useScaledFontSize';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('SettingsScreenMobile');

type SettingsItemBase = {
  id: string;
  title: string;
  subtitle?: string;
};

type SettingsItemPress = SettingsItemBase & {
  onPress: () => void;
  showChevron: boolean;
  showToggle?: never;
  value?: never;
  onToggle?: never;
};

type SettingsItemToggle = SettingsItemBase & {
  value: boolean;
  onToggle: (value: boolean) => void;
  showToggle: boolean;
  onPress?: never;
  showChevron?: never;
};

type SettingsItemInfo = SettingsItemBase & {
  onPress?: never;
  showChevron?: never;
  showToggle?: never;
  value?: never;
  onToggle?: never;
};

type SettingsItem = SettingsItemPress | SettingsItemToggle | SettingsItemInfo;

export const SettingsScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { isRTL } = useDirection();
  const notifications = useNotifications();
  const scaledFontSize = useScaledFontSize();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [downloadOnWifiOnly, setDownloadOnWifiOnly] = useState(true);

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactLight');
    }
  };

  const handleToggle = (setter: (value: boolean) => void, value: boolean) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selection');
    }
    setter(value);
  };

  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: t('settings.general'),
      items: [
        {
          id: 'language',
          title: t('settings.language'),
          subtitle: i18n.language === 'he' ? 'עברית' : i18n.language === 'en' ? 'English' : 'Español',
          onPress: () => {
            handlePress();
            navigation.navigate('LanguageSettings');
          },
          showChevron: true,
        },
        {
          id: 'notifications',
          title: t('settings.notifications'),
          subtitle: notificationsEnabled ? t('settings.enabled') : t('settings.disabled'),
          onPress: () => {
            handlePress();
            navigation.navigate('NotificationSettings');
          },
          showChevron: true,
        },
      ],
    },
    {
      title: t('settings.playback'),
      items: [
        {
          id: 'autoplay',
          title: t('settings.autoplay'),
          subtitle: t('settings.autoplayDescription'),
          value: autoPlayEnabled,
          onToggle: (value: boolean) => handleToggle(setAutoPlayEnabled, value),
          showToggle: true,
        },
        {
          id: 'voiceCommands',
          title: t('settings.voiceCommands'),
          subtitle: t('settings.voiceCommandsDescription'),
          value: voiceEnabled,
          onToggle: (value: boolean) => handleToggle(setVoiceEnabled, value),
          showToggle: true,
        },
      ],
    },
    {
      title: t('settings.downloads'),
      items: [
        {
          id: 'wifiOnly',
          title: t('settings.wifiOnly'),
          subtitle: t('settings.wifiOnlyDescription'),
          value: downloadOnWifiOnly,
          onToggle: (value: boolean) => handleToggle(setDownloadOnWifiOnly, value),
          showToggle: true,
        },
      ],
    },
    {
      title: t('settings.account'),
      items: [
        {
          id: 'profile',
          title: t('settings.editProfile'),
          subtitle: user?.email || '',
          onPress: () => {
            handlePress();
            notifications.showInfo(t('settings.comingSoon'), t('settings.editProfile'));
          },
          showChevron: true,
        },
        {
          id: 'subscription',
          title: t('settings.subscription'),
          subtitle: user?.subscription?.toUpperCase() || t('settings.free'),
          onPress: () => {
            handlePress();
            navigation.navigate('Subscribe');
          },
          showChevron: true,
        },
      ],
    },
    {
      title: t('settings.about'),
      items: [
        {
          id: 'version',
          title: t('settings.version'),
          subtitle: 'Bayit+ v1.0.0',
        },
        {
          id: 'terms',
          title: t('settings.terms'),
          onPress: () => {
            handlePress();
            notifications.showInfo(t('settings.comingSoon'), t('settings.terms'));
          },
          showChevron: true,
        },
        {
          id: 'privacy',
          title: t('settings.privacy'),
          onPress: () => {
            handlePress();
            notifications.showInfo(t('settings.comingSoon'), t('settings.privacy'));
          },
          showChevron: true,
        },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl * 2 }}>
      {/* Header */}
      <View className="mb-8">
        <Text className="text-white mb-1" style={typography.h1}>{t('settings.title')}</Text>
        <Text className="text-white/60" style={typography.body}>{t('settings.subtitle')}</Text>
      </View>

      {/* Settings Sections */}
      {settingsSections.map((section, sectionIndex) => (
        <View key={section.title} className="mb-8">
          <Text
            className="text-white/60 uppercase font-semibold mb-2 px-1"
            style={{ ...typography.bodySmall, fontSize: scaledFontSize.sm }}
            accessibilityRole="header"
            accessible={true}
          >
            {section.title}
          </Text>

          {section.items.map((item) => (
            <Pressable
              key={item.id}
              onPress={'onPress' in item && item.onPress ? item.onPress : undefined}
              disabled={!('onPress' in item) && !('onToggle' in item)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              accessibilityRole={'onPress' in item && item.onPress ? 'button' : 'switch'}
              accessibilityLabel={item.title}
              accessibilityHint={
                'showToggle' in item && item.showToggle
                  ? `${item.title} toggle. Currently ${('value' in item ? item.value : false) ? 'on' : 'off'}`
                  : ('onPress' in item && item.onPress ? `Double tap to navigate to ${item.title}` : item.subtitle)
              }
              accessible={true}
            >
              <GlassView className="flex-row items-center justify-between py-3 px-6 rounded-xl mb-2" style={{ minHeight: touchTarget.minHeight }}>
                <View className="flex-1 mr-3">
                  <Text
                    className="text-white font-medium"
                    style={{ ...typography.body, fontSize: scaledFontSize.base }}
                    accessibilityElementsHidden
                  >
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text
                      className="text-white/60 mt-0.5"
                      style={{ ...typography.caption, fontSize: scaledFontSize.sm }}
                      accessibilityElementsHidden
                    >
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  {'showToggle' in item && item.showToggle && 'onToggle' in item && item.onToggle && (
                    <GlassToggle
                      value={'value' in item ? item.value : false}
                      onValueChange={item.onToggle}
                      size="medium"
                      isRTL={isRTL}
                      testID={`toggle-${item.id}`}
                      accessible={false}
                    />
                  )}
                  {'showChevron' in item && item.showChevron && (
                    <Text className="text-2xl text-white/60" accessibilityElementsHidden>{isRTL ? '‹' : '›'}</Text>
                  )}
                </View>
              </GlassView>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

export default SettingsScreenMobile;
