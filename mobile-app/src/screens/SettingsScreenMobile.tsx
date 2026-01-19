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
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView, GlassButton } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { spacing, colors, typography, touchTarget } from '../theme';

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
            Alert.alert(t('settings.editProfile'), t('settings.comingSoon'));
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
            Alert.alert(t('settings.terms'), t('settings.comingSoon'));
          },
          showChevron: true,
        },
        {
          id: 'privacy',
          title: t('settings.privacy'),
          onPress: () => {
            handlePress();
            Alert.alert(t('settings.privacy'), t('settings.comingSoon'));
          },
          showChevron: true,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
      </View>

      {/* Settings Sections */}
      {settingsSections.map((section, sectionIndex) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          {section.items.map((item) => (
            <Pressable
              key={item.id}
              onPress={'onPress' in item && item.onPress ? item.onPress : undefined}
              disabled={!('onPress' in item) && !('onToggle' in item)}
              style={({ pressed }) => [pressed && styles.itemPressed]}
            >
              <GlassView style={styles.item}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                <View style={styles.itemRight}>
                  {'showToggle' in item && item.showToggle && 'onToggle' in item && item.onToggle && (
                    <Switch
                      value={'value' in item ? item.value : false}
                      onValueChange={item.onToggle}
                      trackColor={{ false: colors.backgroundElevated, true: colors.primary }}
                      thumbColor={colors.text}
                    />
                  )}
                  {'showChevron' in item && item.showChevron && (
                    <Text style={styles.chevron}>{isRTL ? '‹' : '›'}</Text>
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
  itemPressed: {
    opacity: 0.7,
  },
  itemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemTitle: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  itemSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
  },
});

export default SettingsScreenMobile;
