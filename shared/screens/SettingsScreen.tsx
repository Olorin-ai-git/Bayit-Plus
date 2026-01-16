import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlassView } from '../components/ui';
import { useDirection } from '../hooks/useDirection';
import { useAuthStore } from '../stores/authStore';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import type { QualityLevel } from '../components/player/QualitySelector';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  value,
  onPress,
  children,
}) => {
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [isFocused, setIsFocused] = useState(false);

  const content = (
    <View
      style={[
        styles.settingRow,
        { flexDirection },
        isFocused && styles.settingRowFocused,
      ]}
    >
      <View style={[styles.settingLeft, { flexDirection }]}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={[styles.settingLabel, { textAlign }]}>{label}</Text>
      </View>
      {children ? (
        children
      ) : (
        <View style={[styles.settingRight, { flexDirection }]}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          <Text style={styles.chevron}>{isRTL ? '◀' : '▶'}</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { user, logout } = useAuthStore();
  const { preferences, updatePreferences } = useVoiceSettingsStore();

  // Local state for settings
  const [notifications, setNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [subtitles, setSubtitles] = useState(true);
  const [wakeWord, setWakeWord] = useState(preferences?.wake_word_enabled ?? true);

  // Video quality preferences
  const [defaultQuality, setDefaultQuality] = useState<QualityLevel>('auto');
  const [autoAdjustQuality, setAutoAdjustQuality] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);

  // Parental controls
  const [parentalControlsEnabled, setParentalControlsEnabled] = useState(false);
  const [parentalControlPIN, setParentalControlPIN] = useState<string>('');
  const [contentRating, setContentRating] = useState<string>('PG-13');
  const [showPINModal, setShowPINModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinModalMode, setPinModalMode] = useState<'setup' | 'verify' | 'change'>('setup');

  const currentLanguage = (() => {
    switch (i18n.language) {
      case 'he':
        return 'עברית';
      case 'es':
        return 'Español';
      default:
        return 'English';
    }
  })();

  const handleLanguageChange = async () => {
    const languages = ['he', 'en', 'es'];
    const currentIndex = languages.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    const newLang = languages[nextIndex];
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem('bayit-language', newLang);
  };

  const handleWakeWordToggle = async (value: boolean) => {
    setWakeWord(value);
    if (preferences) {
      await updatePreferences({ ...preferences, wake_word_enabled: value });
    }
  };

  // Load video quality preferences
  useEffect(() => {
    const loadVideoPreferences = async () => {
      try {
        const savedQuality = await AsyncStorage.getItem('bayit_video_quality_preference');
        const savedAutoAdjust = await AsyncStorage.getItem('bayit_auto_adjust_quality');
        const savedDataSaver = await AsyncStorage.getItem('bayit_data_saver_mode');

        if (savedQuality) {
          setDefaultQuality(savedQuality as QualityLevel);
        }
        if (savedAutoAdjust !== null) {
          setAutoAdjustQuality(savedAutoAdjust === 'true');
        }
        if (savedDataSaver !== null) {
          setDataSaver(savedDataSaver === 'true');
        }
      } catch (error) {
        console.error('Failed to load video preferences:', error);
      }
    };

    loadVideoPreferences();
  }, []);

  const handleQualityChange = async () => {
    const qualities: QualityLevel[] = ['auto', '1080p', '720p', '480p', '360p'];
    const currentIndex = qualities.indexOf(defaultQuality);
    const nextIndex = (currentIndex + 1) % qualities.length;
    const newQuality = qualities[nextIndex];

    setDefaultQuality(newQuality);
    await AsyncStorage.setItem('bayit_video_quality_preference', newQuality);
  };

  const handleAutoAdjustToggle = async (value: boolean) => {
    setAutoAdjustQuality(value);
    await AsyncStorage.setItem('bayit_auto_adjust_quality', value.toString());
  };

  const handleDataSaverToggle = async (value: boolean) => {
    setDataSaver(value);
    await AsyncStorage.setItem('bayit_data_saver_mode', value.toString());
  };

  const getQualityLabel = (quality: QualityLevel): string => {
    if (quality === 'auto') return t('settings.qualityAuto', 'Auto');
    return quality;
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>⚙️</Text>
        </View>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('nav.settings', 'Settings')}</Text>
          <Text style={[styles.pageSubtitle, { textAlign }]}>
            {t('settings.subtitle', 'Customize your experience')}
          </Text>
        </View>
      </View>

      {/* Language Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.language', 'Language')}
        </Text>
        <SettingRow
          icon="🌍"
          label={t('settings.appLanguage', 'App Language')}
          value={currentLanguage}
          onPress={handleLanguageChange}
        />
      </GlassView>

      {/* Voice Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.voice', 'Voice Control')}
        </Text>
        <SettingRow icon="🎤" label={t('settings.wakeWord', 'Wake Word Activation')}>
          <Switch
            value={wakeWord}
            onValueChange={handleWakeWordToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          icon="🔊"
          label={t('settings.voiceSettings', 'Voice Preferences')}
          onPress={() => navigation.navigate('VoiceSettings')}
        />
      </GlassView>

      {/* Playback Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.playback', 'Playback')}
        </Text>
        <SettingRow icon="▶️" label={t('settings.autoplay', 'Autoplay Next Episode')}>
          <Switch
            value={autoplay}
            onValueChange={setAutoplay}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow icon="💬" label={t('settings.subtitles', 'Subtitles')}>
          <Switch
            value={subtitles}
            onValueChange={setSubtitles}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Video & Audio Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.videoAudio', 'Video & Audio')}
        </Text>
        <SettingRow
          icon="🎬"
          label={t('settings.defaultQuality', 'Default Video Quality')}
          value={getQualityLabel(defaultQuality)}
          onPress={handleQualityChange}
        />
        <SettingRow
          icon="📶"
          label={t('settings.autoAdjustQuality', 'Auto-Adjust Quality')}
        >
          <Switch
            value={autoAdjustQuality}
            onValueChange={handleAutoAdjustToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          icon="📉"
          label={t('settings.dataSaver', 'Data Saver Mode')}
        >
          <Switch
            value={dataSaver}
            onValueChange={handleDataSaverToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Notification Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.notifications', 'Notifications')}
        </Text>
        <SettingRow icon="🔔" label={t('settings.pushNotifications', 'Push Notifications')}>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Account */}
      {user && (
        <GlassView style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('settings.account', 'Account')}
          </Text>
          <SettingRow
            icon="👤"
            label={t('settings.profile', 'Profile')}
            value={user.name || user.email}
            onPress={() => navigation.navigate('Profile')}
          />
          <SettingRow
            icon="💎"
            label={t('settings.subscription', 'Subscription')}
            value={user.subscription?.plan || t('common.free', 'Free')}
            onPress={() => navigation.navigate('Subscribe')}
          />
          <SettingRow
            icon="🚪"
            label={t('settings.logout', 'Log Out')}
            onPress={handleLogout}
          />
        </GlassView>
      )}

      {/* Privacy & Legal */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.privacy', 'Privacy & Legal')}
        </Text>
        <SettingRow
          icon="🔒"
          label={t('settings.privacyPolicy', 'Privacy Policy')}
          onPress={() => {}}
        />
        <SettingRow
          icon="📄"
          label={t('settings.termsOfService', 'Terms of Service')}
          onPress={() => {}}
        />
      </GlassView>

      {/* Help */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.support', 'Support')}
        </Text>
        <SettingRow
          icon="❓"
          label={t('settings.helpCenter', 'Help Center')}
          onPress={() => navigation.navigate('Help')}
        />
        <SettingRow
          icon="📧"
          label={t('settings.contactUs', 'Contact Us')}
          onPress={() => {}}
        />
      </GlassView>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>{t('common.appVersion', 'Bayit+ v1.0.0')}</Text>
        <Text style={styles.copyright}>© 2026 Bayit+</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: isTV ? spacing.xl : spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: isTV ? 64 : 48,
    height: isTV ? 64 : 48,
    borderRadius: isTV ? 32 : 24,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: isTV ? 32 : 24,
  },
  pageTitle: {
    fontSize: isTV ? 36 : 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: isTV ? 18 : 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
  },
  sectionTitle: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: isTV ? spacing.md : spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  settingRowFocused: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingIcon: {
    fontSize: isTV ? 24 : 20,
  },
  settingLabel: {
    fontSize: isTV ? 18 : 16,
    color: colors.text,
  },
  settingValue: {
    fontSize: isTV ? 16 : 14,
    color: colors.textMuted,
  },
  chevron: {
    fontSize: isTV ? 16 : 14,
    color: colors.textMuted,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  appVersion: {
    fontSize: isTV ? 14 : 12,
    color: colors.textMuted,
  },
  copyright: {
    fontSize: isTV ? 12 : 10,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
