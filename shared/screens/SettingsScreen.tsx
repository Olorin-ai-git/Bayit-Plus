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

      {/* Parental Controls */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.parentalControls', 'Parental Controls')}
        </Text>
        <SettingRow
          icon="🔐"
          label={t('settings.enableParentalControls', 'Enable Parental Controls')}
        >
          <Switch
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
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
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
          <Switch
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
          <Switch
            value={autoDownloadNextEpisode}
            onValueChange={handleAutoDownloadToggle}
            trackColor={{ false: colors.backgroundLighter, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
      </GlassView>

      {/* Accessibility Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('settings.accessibility', 'Accessibility')}
        </Text>
        <SettingRow
          icon="🔤"
          label={t('settings.largeText', 'Large Text')}
        >
          <Switch
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
          <Switch
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
          <Switch
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
          <Switch
            value={reducedMotion}
            onValueChange={handleReducedMotionToggle}
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
        <View style={styles.modalOverlay}>
          <GlassView style={styles.pinModal}>
            <Text style={[styles.pinModalTitle, { textAlign: 'center' }]}>
              {pinModalMode === 'setup'
                ? t('settings.setupPIN', 'Set Up Parental Control PIN')
                : pinModalMode === 'change'
                ? t('settings.enterNewPIN', 'Enter New PIN')
                : t('settings.enterPIN', 'Enter PIN')}
            </Text>
            <Text style={[styles.pinModalDescription, { textAlign: 'center' }]}>
              {pinModalMode === 'setup' || pinModalMode === 'change'
                ? t('settings.pinDescription', 'Enter a 4-digit PIN to protect parental controls')
                : t('settings.verifyPIN', 'Enter your PIN to continue')}
            </Text>

            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={(text) => setPinInput(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <View style={styles.pinModalButtons}>
              <TouchableOpacity
                style={[styles.pinModalButton, styles.pinModalButtonCancel]}
                onPress={() => {
                  setPinInput('');
                  setShowPINModal(false);
                }}
              >
                <Text style={styles.pinModalButtonText}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pinModalButton,
                  styles.pinModalButtonConfirm,
                  pinInput.length !== 4 && styles.pinModalButtonDisabled,
                ]}
                onPress={handlePINSubmit}
                disabled={pinInput.length !== 4}
              >
                <Text style={styles.pinModalButtonText}>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  pinModal: {
    width: isTV ? 500 : '100%',
    maxWidth: 400,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  pinModalTitle: {
    fontSize: isTV ? 24 : 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pinModalDescription: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  pinInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: isTV ? 32 : 24,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: isTV ? 20 : 16,
    fontWeight: 'bold',
    marginBottom: spacing.xl,
  },
  pinModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pinModalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
  },
  pinModalButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pinModalButtonConfirm: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary,
  },
  pinModalButtonDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  pinModalButtonText: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
  },
});
