import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlassView, TVSwitch } from '../components/ui';
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
      className={`flex-row items-center justify-between ${isTV ? 'py-4' : 'py-3'} border-b border-white/5 rounded-xl px-3 border-2 ${isFocused ? 'bg-purple-500/20 border-purple-500' : 'border-transparent'}`}
      style={{ flexDirection }}
    >
      <View className={`flex-row items-center gap-4 flex-1`} style={{ flexDirection }}>
        <Text className={isTV ? 'text-2xl' : 'text-xl'}>{icon}</Text>
        <Text className={`${isTV ? 'text-lg' : 'text-base'} text-white`} style={{ textAlign }}>{label}</Text>
      </View>
      {children ? (
        children
      ) : (
        <View className="flex-row items-center gap-2" style={{ flexDirection }}>
          {value && <Text className={`${isTV ? 'text-base' : 'text-sm'} text-white/40`}>{value}</Text>}
          <Text className={`${isTV ? 'text-base' : 'text-sm'} text-white/40`}>{isRTL ? '◀' : '▶'}</Text>
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

  // Download preferences
  const [downloadQuality, setDownloadQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [wifiOnlyDownloads, setWifiOnlyDownloads] = useState(true);
  const [autoDownloadNextEpisode, setAutoDownloadNextEpisode] = useState(false);

  // Accessibility preferences
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderEnhanced, setScreenReaderEnhanced] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    await AsyncStorage.setItem('@bayit_language', newLang);
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

  // Load parental controls preferences
  useEffect(() => {
    const loadParentalControls = async () => {
      try {
        const savedEnabled = await AsyncStorage.getItem('bayit_parental_controls_enabled');
        const savedPIN = await AsyncStorage.getItem('bayit_parental_control_pin');
        const savedRating = await AsyncStorage.getItem('bayit_content_rating_restriction');

        if (savedEnabled !== null) {
          setParentalControlsEnabled(savedEnabled === 'true');
        }
        if (savedPIN) {
          setParentalControlPIN(savedPIN);
        }
        if (savedRating) {
          setContentRating(savedRating);
        }
      } catch (error) {
        console.error('Failed to load parental controls:', error);
      }
    };

    loadParentalControls();
  }, []);

  const handleParentalControlsToggle = async (value: boolean) => {
    if (value && !parentalControlPIN) {
      // Need to set up PIN first
      setPinModalMode('setup');
      setShowPINModal(true);
    } else if (value && parentalControlPIN) {
      // PIN already exists, enable
      setParentalControlsEnabled(true);
      await AsyncStorage.setItem('bayit_parental_controls_enabled', 'true');
    } else {
      // Disabling - require PIN verification
      if (parentalControlPIN) {
        setPinModalMode('verify');
        setShowPINModal(true);
      } else {
        setParentalControlsEnabled(false);
        await AsyncStorage.setItem('bayit_parental_controls_enabled', 'false');
      }
    }
  };

  const handlePINSubmit = async () => {
    if (pinInput.length !== 4) {
      Alert.alert(
        t('settings.invalidPIN', 'Invalid PIN'),
        t('settings.pinMustBe4Digits', 'PIN must be 4 digits')
      );
      return;
    }

    if (pinModalMode === 'setup') {
      // Save new PIN
      setParentalControlPIN(pinInput);
      setParentalControlsEnabled(true);
      await AsyncStorage.setItem('bayit_parental_control_pin', pinInput);
      await AsyncStorage.setItem('bayit_parental_controls_enabled', 'true');

      Alert.alert(
        t('settings.pinSet', 'PIN Set'),
        t('settings.parentalControlsEnabled', 'Parental controls have been enabled')
      );
    } else if (pinModalMode === 'verify') {
      // Verify PIN to disable
      if (pinInput === parentalControlPIN) {
        setParentalControlsEnabled(false);
        await AsyncStorage.setItem('bayit_parental_controls_enabled', 'false');

        Alert.alert(
          t('settings.success', 'Success'),
          t('settings.parentalControlsDisabled', 'Parental controls have been disabled')
        );
      } else {
        Alert.alert(
          t('settings.incorrectPIN', 'Incorrect PIN'),
          t('settings.tryAgain', 'Please try again')
        );
        setPinInput('');
        return;
      }
    } else if (pinModalMode === 'change') {
      // Save new PIN
      setParentalControlPIN(pinInput);
      await AsyncStorage.setItem('bayit_parental_control_pin', pinInput);

      Alert.alert(
        t('settings.pinChanged', 'PIN Changed'),
        t('settings.pinChangedSuccess', 'Your PIN has been updated')
      );
    }

    setPinInput('');
    setShowPINModal(false);
  };

  const handleChangePIN = () => {
    setPinModalMode('change');
    setShowPINModal(true);
  };

  const handleContentRatingChange = async () => {
    const ratings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
    const currentIndex = ratings.indexOf(contentRating);
    const nextIndex = (currentIndex + 1) % ratings.length;
    const newRating = ratings[nextIndex];

    setContentRating(newRating);
    await AsyncStorage.setItem('bayit_content_rating_restriction', newRating);
  };

  const getRatingDescription = (rating: string): string => {
    const descriptions: Record<string, string> = {
      'G': t('settings.ratingG', 'General Audiences'),
      'PG': t('settings.ratingPG', 'Parental Guidance'),
      'PG-13': t('settings.ratingPG13', 'Parents Strongly Cautioned'),
      'R': t('settings.ratingR', 'Restricted'),
      'NC-17': t('settings.ratingNC17', 'Adults Only'),
    };
    return descriptions[rating] || rating;
  };

  // Load download preferences
  useEffect(() => {
    const loadDownloadPreferences = async () => {
      try {
        const savedQuality = await AsyncStorage.getItem('bayit_download_quality');
        const savedWifiOnly = await AsyncStorage.getItem('bayit_wifi_only_downloads');
        const savedAutoDownload = await AsyncStorage.getItem('bayit_auto_download_next_episode');

        if (savedQuality) {
          setDownloadQuality(savedQuality as 'high' | 'medium' | 'low');
        }
        if (savedWifiOnly !== null) {
          setWifiOnlyDownloads(savedWifiOnly === 'true');
        }
        if (savedAutoDownload !== null) {
          setAutoDownloadNextEpisode(savedAutoDownload === 'true');
        }
      } catch (error) {
        console.error('Failed to load download preferences:', error);
      }
    };

    loadDownloadPreferences();
  }, []);

  const handleDownloadQualityChange = async () => {
    const qualities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    const currentIndex = qualities.indexOf(downloadQuality);
    const nextIndex = (currentIndex + 1) % qualities.length;
    const newQuality = qualities[nextIndex];

    setDownloadQuality(newQuality);
    await AsyncStorage.setItem('bayit_download_quality', newQuality);
  };

  const handleWifiOnlyToggle = async (value: boolean) => {
    setWifiOnlyDownloads(value);
    await AsyncStorage.setItem('bayit_wifi_only_downloads', value.toString());
  };

  const handleAutoDownloadToggle = async (value: boolean) => {
    setAutoDownloadNextEpisode(value);
    await AsyncStorage.setItem('bayit_auto_download_next_episode', value.toString());
  };

  const getDownloadQualityLabel = (quality: 'high' | 'medium' | 'low'): string => {
    const labels = {
      high: t('settings.qualityHigh', 'High (1080p)'),
      medium: t('settings.qualityMedium', 'Medium (720p)'),
      low: t('settings.qualityLow', 'Low (480p)'),
    };
    return labels[quality];
  };

  // Load accessibility preferences
  useEffect(() => {
    const loadAccessibilityPreferences = async () => {
      try {
        const savedLargeText = await AsyncStorage.getItem('bayit_large_text');
        const savedHighContrast = await AsyncStorage.getItem('bayit_high_contrast');
        const savedScreenReader = await AsyncStorage.getItem('bayit_screen_reader_enhanced');
        const savedReducedMotion = await AsyncStorage.getItem('bayit_reduced_motion');

        if (savedLargeText !== null) {
          setLargeText(savedLargeText === 'true');
        }
        if (savedHighContrast !== null) {
          setHighContrast(savedHighContrast === 'true');
        }
        if (savedScreenReader !== null) {
          setScreenReaderEnhanced(savedScreenReader === 'true');
        }
        if (savedReducedMotion !== null) {
          setReducedMotion(savedReducedMotion === 'true');
        }
      } catch (error) {
        console.error('Failed to load accessibility preferences:', error);
      }
    };

    loadAccessibilityPreferences();
  }, []);

  const handleLargeTextToggle = async (value: boolean) => {
    setLargeText(value);
    await AsyncStorage.setItem('bayit_large_text', value.toString());
  };

  const handleHighContrastToggle = async (value: boolean) => {
    setHighContrast(value);
    await AsyncStorage.setItem('bayit_high_contrast', value.toString());
  };

  const handleScreenReaderToggle = async (value: boolean) => {
    setScreenReaderEnhanced(value);
    await AsyncStorage.setItem('bayit_screen_reader_enhanced', value.toString());
  };

  const handleReducedMotionToggle = async (value: boolean) => {
    setReducedMotion(value);
    await AsyncStorage.setItem('bayit_reduced_motion', value.toString());
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <ScrollView className="flex-1 bg-black" contentContainerClassName={`${isTV ? 'p-8' : 'p-4'} pb-16`}>
      {/* Header */}
      <View className={`gap-4 mb-8`} style={{ flexDirection }}>
        <View className={`${isTV ? 'w-16 h-16 rounded-full' : 'w-12 h-12 rounded-3xl'} bg-purple-500/20 justify-center items-center`}>
          <Text className={isTV ? 'text-4xl' : 'text-2xl'}>⚙️</Text>
        </View>
        <View>
          <Text className={`${isTV ? 'text-4xl' : 'text-3xl'} font-bold text-white`} style={{ textAlign }}>{t('nav.settings', 'Settings')}</Text>
          <Text className={`${isTV ? 'text-lg' : 'text-sm'} text-white/60 mt-0.5`} style={{ textAlign }}>
            {t('settings.subtitle', 'Customize your experience')}
          </Text>
        </View>
      </View>

      {/* Language Settings */}
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
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
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
          {t('settings.voice', 'Voice Control')}
        </Text>
        <SettingRow icon="🎤" label={t('settings.wakeWord', 'Wake Word Activation')}>
          <TVSwitch
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
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
          {t('settings.playback', 'Playback')}
        </Text>
        <SettingRow icon="▶️" label={t('settings.autoplay', 'Autoplay Next Episode')}>
          <TVSwitch
            value={autoplay}
            onValueChange={setAutoplay}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow icon="💬" label={t('settings.subtitles', 'Subtitles')}>
          <TVSwitch
            value={subtitles}
            onValueChange={setSubtitles}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Display Settings */}
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
          {t('settings.display', 'Display')}
        </Text>
        <SettingRow
          icon="🏠"
          label={t('settings.homePageSections', 'Home Page Sections')}
          onPress={() => navigation.navigate('HomeSectionConfiguration' as never)}
        />
      </GlassView>

      {/* Video & Audio Settings */}
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
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
          <TVSwitch
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
          <TVSwitch
            value={dataSaver}
            onValueChange={handleDataSaverToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Parental Controls */}
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
          {t('settings.parentalControls', 'Parental Controls')}
        </Text>
        <SettingRow
          icon="🔐"
          label={t('settings.enableParentalControls', 'Enable Parental Controls')}
        >
          <TVSwitch
            value={parentalControlsEnabled}
            onValueChange={handleParentalControlsToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        {parentalControlsEnabled && (
          <>
            <SettingRow
              icon="🔢"
              label={t('settings.changePIN', 'Change PIN')}
              onPress={handleChangePIN}
            />
            <SettingRow
              icon="🎭"
              label={t('settings.contentRating', 'Content Rating Restriction')}
              value={`${contentRating} - ${getRatingDescription(contentRating)}`}
              onPress={handleContentRatingChange}
            />
          </>
        )}
      </GlassView>

      {/* Download Settings */}
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
          {t('settings.downloads', 'Downloads')}
        </Text>
        <SettingRow
          icon="📥"
          label={t('settings.downloadQuality', 'Download Quality')}
          value={getDownloadQualityLabel(downloadQuality)}
          onPress={handleDownloadQualityChange}
        />
        <SettingRow
          icon="📶"
          label={t('settings.wifiOnly', 'WiFi Only Downloads')}
        >
          <TVSwitch
            value={wifiOnlyDownloads}
            onValueChange={handleWifiOnlyToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          icon="⏭️"
          label={t('settings.autoDownloadNext', 'Auto-Download Next Episode')}
        >
          <TVSwitch
            value={autoDownloadNextEpisode}
            onValueChange={handleAutoDownloadToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Accessibility Settings */}
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
          {t('settings.accessibility', 'Accessibility')}
        </Text>
        <SettingRow
          icon="🔤"
          label={t('settings.largeText', 'Large Text')}
        >
          <TVSwitch
            value={largeText}
            onValueChange={handleLargeTextToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          icon="🌓"
          label={t('settings.highContrast', 'High Contrast Mode')}
        >
          <TVSwitch
            value={highContrast}
            onValueChange={handleHighContrastToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          icon="👁️"
          label={t('settings.screenReader', 'Enhanced Screen Reader Support')}
        >
          <TVSwitch
            value={screenReaderEnhanced}
            onValueChange={handleScreenReaderToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          icon="🎬"
          label={t('settings.reducedMotion', 'Reduced Motion')}
        >
          <TVSwitch
            value={reducedMotion}
            onValueChange={handleReducedMotionToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Notification Settings */}
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
          {t('settings.notifications', 'Notifications')}
        </Text>
        <SettingRow icon="🔔" label={t('settings.pushNotifications', 'Push Notifications')}>
          <TVSwitch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Account */}
      {user && (
        <GlassView className="p-4 mb-4 rounded-3xl">
          <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
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
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
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
      <GlassView className="p-4 mb-4 rounded-3xl">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-white/40 mb-4 uppercase tracking-wider`} style={{ textAlign }}>
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
      <View className="items-center mt-8 pt-6">
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} text-white/40`}>{t('common.appVersion', 'Bayit+ v1.0.0')}</Text>
        <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} text-white/40 mt-1`}>© 2026 Bayit+</Text>
      </View>

      {/* PIN Entry Modal */}
      <Modal
        visible={showPINModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPinInput('');
          setShowPINModal(false);
        }}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-8">
          <GlassView className={`${isTV ? 'w-[500px]' : 'w-full'} max-w-[400px] p-8 rounded-3xl border-2 border-purple-500/30`}>
            <Text className={`${isTV ? 'text-2xl' : 'text-xl'} font-bold text-white mb-2 text-center`}>
              {pinModalMode === 'setup'
                ? t('settings.setupPIN', 'Set Up Parental Control PIN')
                : pinModalMode === 'change'
                ? t('settings.enterNewPIN', 'Enter New PIN')
                : t('settings.enterPIN', 'Enter PIN')}
            </Text>
            <Text className={`${isTV ? 'text-base' : 'text-sm'} text-white/60 mb-8 text-center`}>
              {pinModalMode === 'setup' || pinModalMode === 'change'
                ? t('settings.pinDescription', 'Enter a 4-digit PIN to protect parental controls')
                : t('settings.verifyPIN', 'Enter your PIN to continue')}
            </Text>

            <TextInput
              className={`bg-white/5 border-2 border-purple-500/30 rounded-2xl px-4 py-4 ${isTV ? 'text-4xl' : 'text-2xl'} text-white text-center font-bold mb-8`}
              style={{ letterSpacing: isTV ? 20 : 16 }}
              value={pinInput}
              onChangeText={(text) => setPinInput(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <View className="flex-row gap-4">
              <TouchableOpacity
                className="flex-1 py-4 rounded-2xl items-center border-2 bg-white/5 border-white/20"
                onPress={() => {
                  setPinInput('');
                  setShowPINModal(false);
                }}
              >
                <Text className={`${isTV ? 'text-lg' : 'text-base'} font-semibold text-white`}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl items-center border-2 ${pinInput.length !== 4 ? 'opacity-50 border-purple-500/20' : 'border-purple-500'} bg-purple-500/20`}
                onPress={handlePINSubmit}
                disabled={pinInput.length !== 4}
              >
                <Text className={`${isTV ? 'text-lg' : 'text-base'} font-semibold text-white`}>
                  {t('common.confirm', 'Confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassView>
        </View>
      </Modal>
    </ScrollView>
  );
}

