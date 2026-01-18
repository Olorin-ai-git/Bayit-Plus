/**
 * Voice Chat Modal
 * Full-screen modal for voice interactions with the AI wizard assistant
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Video, ResizeMode } from 'expo-av';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore, VoiceState } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { VoiceWaveform, CircularWaveform } from './VoiceWaveform';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';

// Wizard avatar images for different states (larger sizes for modal)
const WIZARD_AVATARS = {
  idle: require('../../assets/images/characters/wizard/wizard1/64x64.png'),
  listening: require('../../assets/images/characters/wizard/wizard2/64x64.png'),
  speaking: require('../../assets/images/characters/wizard/wizard2/64x64.png'),
  processing: require('../../assets/images/characters/wizard/wizard3/64x64.png'),
  error: require('../../assets/images/characters/wizard/wizard3/64x64.png'),
};

// Wizard hat for decorative purposes
const WIZARD_HAT = require('../../assets/images/characters/hat/64x64.png');

// Voice interaction videos
const VOICE_VIDEOS = {
  request: require('../../assets/video/voice/request.mp4'),
  response: require('../../assets/video/voice/response.mp4'),
  splash: require('../../assets/video/wizard/olorin.mp4'),
};

interface VoiceChatModalProps {
  visible: boolean;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onInterrupt: () => void;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  visible,
  onClose,
  onStartListening,
  onStopListening,
  onInterrupt,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const {
    voiceState,
    currentTranscript,
    lastResponse,
    setVoiceState,
  } = useSupportStore();

  const [isFocused, setIsFocused] = useState(false);

  // Fade animation
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const handleMainButtonPress = useCallback(() => {
    switch (voiceState) {
      case 'idle':
        onStartListening();
        break;
      case 'listening':
        onStopListening();
        break;
      case 'speaking':
        onInterrupt();
        break;
      case 'processing':
        // Cannot interrupt processing
        break;
      case 'error':
        setVoiceState('idle');
        break;
    }
  }, [voiceState, onStartListening, onStopListening, onInterrupt, setVoiceState]);

  const getMainButtonText = () => {
    switch (voiceState) {
      case 'idle':
        return t('support.voice.action.start', 'Tap to Speak');
      case 'listening':
        return t('support.voice.action.stop', 'Tap to Stop');
      case 'processing':
        return t('support.voice.action.processing', 'Processing...');
      case 'speaking':
        return t('support.voice.action.interrupt', 'Tap to Interrupt');
      case 'error':
        return t('support.voice.action.retry', 'Tap to Retry');
      default:
        return '';
    }
  };

  const getLanguageDisplay = () => {
    const langMap: Record<string, string> = {
      en: 'English',
      he: 'עברית',
      es: 'Español',
    };
    return langMap[i18n.language] || i18n.language;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />

      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {t('support.voice.title', 'Voice Assistant')}
            </Text>
            <View style={styles.languageBadge}>
              <Text style={styles.languageText}>{getLanguageDisplay()}</Text>
            </View>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Avatar/Waveform Visualization */}
          <View style={styles.visualizationContainer}>
            <AvatarVisualization state={voiceState} />
          </View>

          {/* Status Indicator */}
          <VoiceStatusIndicator
            state={voiceState}
            transcript={currentTranscript}
          />

          {/* Last Response */}
          {lastResponse && voiceState === 'idle' && (
            <GlassView style={styles.responseContainer}>
              <Text style={styles.responseLabel}>
                {t('support.voice.lastResponse', 'Last Response')}
              </Text>
              <Text
                style={[styles.responseText, { textAlign }]}
                numberOfLines={4}
              >
                {lastResponse}
              </Text>
            </GlassView>
          )}
        </View>

        {/* Main Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              voiceState === 'listening' && styles.mainButtonListening,
              voiceState === 'speaking' && styles.mainButtonSpeaking,
              voiceState === 'processing' && styles.mainButtonProcessing,
              voiceState === 'error' && styles.mainButtonError,
            ]}
            onPress={handleMainButtonPress}
            disabled={voiceState === 'processing'}
            activeOpacity={0.8}
          >
            <Text style={styles.mainButtonText}>{getMainButtonText()}</Text>
          </TouchableOpacity>

          {/* Help Text */}
          <Text style={[styles.helpText, { textAlign }]}>
            {voiceState === 'idle'
              ? t('support.voice.help.idle', 'Ask me anything about Bayit+')
              : voiceState === 'listening'
              ? t('support.voice.help.listening', 'Speak clearly, I\'m listening...')
              : voiceState === 'speaking'
              ? t('support.voice.help.speaking', 'Tap to ask another question')
              : ''}
          </Text>
        </View>

        {/* Quick Actions */}
        {voiceState === 'idle' && (
          <View style={styles.quickActions}>
            <Text style={[styles.quickActionsTitle, { textAlign }]}>
              {t('support.voice.quickActions', 'Try saying...')}
            </Text>
            <View style={styles.quickActionsRow}>
              <QuickActionChip
                text={t('support.voice.example.help', '"How do I watch live TV?"')}
              />
              <QuickActionChip
                text={t('support.voice.example.billing', '"Tell me about subscriptions"')}
              />
            </View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

interface AvatarVisualizationProps {
  state: VoiceState;
}

const AvatarVisualization: React.FC<AvatarVisualizationProps> = ({ state }) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const videoRef = useRef<Video>(null);
  const [useVideoFallback, setUseVideoFallback] = useState(false);

  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  // Determine which video to play based on state
  const getVideoSource = () => {
    if (state === 'listening') return VOICE_VIDEOS.request;
    if (state === 'speaking') return VOICE_VIDEOS.response;
    return null;
  };

  const videoSource = getVideoSource();
  const size = isTV ? 200 : 160;
  const avatarSize = isTV ? 120 : 96;

  return (
    <Animated.View
      style={[
        styles.avatarOuter,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Circular waveform rings */}
      <CircularWaveform state={state} audioLevel={0.7} />

      {/* Center avatar - Video or Image based on state */}
      <View
        style={[
          styles.avatarInner,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
          },
        ]}
      >
        {videoSource && !useVideoFallback ? (
          <Video
            ref={videoRef}
            source={videoSource}
            style={styles.avatarVideo}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={state === 'listening' || state === 'speaking'}
            isMuted
            onError={() => setUseVideoFallback(true)}
          />
        ) : (
          <View style={styles.wizardAvatarContainer}>
            {/* Wizard Hat */}
            <Image
              source={WIZARD_HAT}
              style={[styles.wizardHat, { width: avatarSize * 0.5, height: avatarSize * 0.5 }]}
              resizeMode="contain"
            />
            {/* Wizard Face */}
            <Image
              source={WIZARD_AVATARS[state]}
              style={[styles.wizardFace, { width: avatarSize, height: avatarSize }]}
              resizeMode="contain"
            />
            {/* Processing indicator */}
            {state === 'processing' && <ProcessingSpinner />}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const ProcessingSpinner: React.FC = () => {
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    rotate.start();
    return () => rotate.stop();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.processingSpinner,
        { transform: [{ rotate: spin }] },
      ]}
    />
  );
};

interface QuickActionChipProps {
  text: string;
}

const QuickActionChip: React.FC<QuickActionChipProps> = ({ text }) => (
  <View style={styles.quickActionChip}>
    <Text style={styles.quickActionText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingTop: isTV ? spacing.xl : spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    paddingVertical: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  closeButton: {
    width: isTV ? 48 : 40,
    height: isTV ? 48 : 40,
    borderRadius: isTV ? 24 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: isTV ? 24 : 20,
    color: colors.text,
  },
  headerCenter: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: isTV ? 24 : 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  languageBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  languageText: {
    fontSize: isTV ? 12 : 10,
    color: colors.primary,
    fontWeight: '600',
  },
  headerSpacer: {
    width: isTV ? 48 : 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    gap: spacing.xl,
  },
  visualizationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOuter: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarInner: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  avatarVideo: {
    width: '100%',
    height: '100%',
  },
  wizardAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardHat: {
    position: 'absolute',
    top: isTV ? -30 : -24,
    zIndex: 1,
  },
  wizardFace: {
    borderRadius: isTV ? 60 : 48,
  },
  processingSpinner: {
    position: 'absolute',
    width: isTV ? 80 : 64,
    height: isTV ? 80 : 64,
    borderRadius: isTV ? 40 : 32,
    borderWidth: 3,
    borderColor: colors.warning,
    borderTopColor: 'transparent',
  },
  responseContainer: {
    width: '100%',
    maxWidth: isTV ? 600 : 400,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  responseLabel: {
    fontSize: isTV ? 12 : 10,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  responseText: {
    fontSize: isTV ? 16 : 14,
    color: colors.text,
    lineHeight: isTV ? 24 : 20,
  },
  actionContainer: {
    alignItems: 'center',
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  mainButton: {
    paddingHorizontal: isTV ? spacing.xl * 2 : spacing.xl,
    paddingVertical: isTV ? spacing.lg : spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    minWidth: isTV ? 240 : 200,
    alignItems: 'center',
  },
  mainButtonListening: {
    backgroundColor: colors.success,
  },
  mainButtonSpeaking: {
    backgroundColor: colors.primary,
  },
  mainButtonProcessing: {
    backgroundColor: colors.warning,
    opacity: 0.8,
  },
  mainButtonError: {
    backgroundColor: colors.error,
  },
  mainButtonText: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.background,
  },
  helpText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  quickActions: {
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    paddingBottom: isTV ? spacing.xl : spacing.lg,
    gap: spacing.sm,
  },
  quickActionsTitle: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickActionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default VoiceChatModal;
