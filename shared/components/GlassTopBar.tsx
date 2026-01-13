import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui';
import { LanguageSelector } from './LanguageSelector';
import { UserAccountMenu } from './UserAccountMenu';
import { VoiceSearchButton } from './VoiceSearchButton';
import { SoundwaveVisualizer } from './SoundwaveVisualizer';
import { UpgradeButton } from './UpgradeButton';
import { colors, spacing, borderRadius } from '../theme';
import { isWeb, isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { useConstantListening } from '../hooks/useConstantListening';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { useTVFocus } from './hooks/useTVFocus';

const logo = require('../assets/logo.png');

interface GlassTopBarProps {
  onMenuPress?: () => void;
  sidebarExpanded?: boolean;
  transcribeAudio?: (audioBlob: Blob) => Promise<{ text: string }>;
  onVoiceCommand?: (text: string) => void;
}

export const GlassTopBar: React.FC<GlassTopBarProps> = ({
  onMenuPress,
  sidebarExpanded = false,
  transcribeAudio,
  onVoiceCommand,
}) => {
  const navigation = useNavigation<any>();
  const { i18n } = useTranslation();
  const { isRTL } = useDirection();
  const isHebrew = i18n.language === 'he';

  // TV focus for search button
  const { handleFocus: handleSearchFocus, handleBlur: handleSearchBlur, focusStyle: searchFocusStyle } = useTVFocus({
    styleType: 'button',
    animated: false,
  });

  // Voice settings
  const { preferences } = useVoiceSettingsStore();
  const wakeWordActive = preferences.wake_word_enabled && (isTV || isWeb);
  const holdButtonModeEnabled = preferences.hold_button_mode;

  // Handle voice transcript - send to chatbot or custom handler
  const handleTranscript = useCallback((text: string) => {
    if (onVoiceCommand) {
      onVoiceCommand(text);
    } else {
      // Default: navigate to search with the voice query
      navigation.navigate('Search', { query: text });
    }
  }, [navigation, onVoiceCommand]);

  // Handle voice errors
  const handleVoiceError = useCallback((error: Error) => {
    console.warn('[GlassTopBar] Voice error:', error.message);
  }, []);

  // Wake word listening hook
  const {
    isListening,
    isProcessing,
    isSendingToServer,
    audioLevel,
    isSupported: wakeWordSupported,
  } = useConstantListening({
    enabled: wakeWordActive && !holdButtonModeEnabled,
    onTranscript: handleTranscript,
    onError: handleVoiceError,
    silenceThresholdMs: preferences.silence_threshold_ms,
    vadSensitivity: preferences.vad_sensitivity,
    transcribeAudio,
  });

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const sidebarWidth = sidebarExpanded ? 280 : 80;
  const sidebarPadding = sidebarWidth + spacing.lg;

  // Show soundwave if wake word is enabled and supported
  const showSoundwave = wakeWordActive && wakeWordSupported && !holdButtonModeEnabled;

  // Show voice button if hold button mode is enabled OR wake word not supported
  const showVoiceButton = holdButtonModeEnabled || !wakeWordSupported;

  return (
    <GlassView intensity="medium" style={[
      styles.container,
      { flexDirection: isRTL ? 'row-reverse' : 'row' },
      isRTL ? { paddingRight: sidebarPadding } : { paddingLeft: sidebarPadding },
    ]}>
      {/* Actions side */}
      <View style={[styles.actionsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Soundwave Visualizer - for wake word listening mode */}
        {showSoundwave && (
          <View style={styles.soundwaveContainer}>
            <SoundwaveVisualizer
              audioLevel={audioLevel}
              isListening={isListening}
              isProcessing={isProcessing}
              isSendingToServer={isSendingToServer}
              compact
            />
          </View>
        )}

        {/* Voice Search Button - for hold-to-talk mode or fallback */}
        {showVoiceButton && (
          <VoiceSearchButton
            onResult={handleTranscript}
            transcribeAudio={transcribeAudio}
          />
        )}

        {/* Search Button */}
        <TouchableOpacity
          onPress={handleSearchPress}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          style={[styles.actionButton, searchFocusStyle]}
        >
          <Text style={styles.actionIcon}>🔍</Text>
        </TouchableOpacity>

        {/* Upgrade Button - for non-admin, non-premium users */}
        <UpgradeButton compact size="sm" />

        {/* Language Selector */}
        <LanguageSelector />

        {/* User Account Menu */}
        <UserAccountMenu />
      </View>

      {/* Logo - Always opposite side of menu icons */}
      <View style={[styles.logoContainer, isRTL ? styles.logoRight : styles.logoLeft]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <View style={styles.logoTextContainer}>
          {isHebrew ? (
            <>
              <Text style={styles.logoText}>בית</Text>
              <Text style={styles.logoPlus}>+</Text>
            </>
          ) : (
            <>
              <Text style={styles.logoPlus}>+</Text>
              <Text style={styles.logoText}>Bayit</Text>
            </>
          )}
        </View>
      </View>

      {/* Right side (RTL) - Menu button (hidden on web) */}
      {!isWeb && (
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.menuButton}
          onFocus={() => {}}
          onBlur={() => {}}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      )}
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg, // Dynamic padding applied in component
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  menuIcon: {
    fontSize: 24,
    color: colors.text,
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    position: 'absolute',
  },
  logoLeft: {
    left: spacing.lg,
  },
  logoRight: {
    right: spacing.lg,
  },
  logo: {
    width: 32,
    height: 24,
    marginBottom: -5,
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  logoPlus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 2,
  },
  actionsContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: '100%',
  },
  soundwaveContainer: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionIcon: {
    fontSize: 20,
  },
});

export default GlassTopBar;
