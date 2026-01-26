/**
 * TV Voice Error Alert Component
 * Large error handling UI with retry functionality
 * Displays error messages and recovery options
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useVoiceStore } from '../../stores/voiceStore';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { voiceComponentStyles } from './voiceStyles';

interface TVVoiceErrorAlertProps {
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const TVVoiceErrorAlert: React.FC<TVVoiceErrorAlertProps> = ({
  onRetry,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const { error, clearError } = useVoiceStore();
  const [focusedButton, setFocusedButton] = useState<string | null>(null);

  if (!error) {
    return null;
  }

  const handleRetry = () => {
    clearError();
    onRetry?.();
  };

  const handleDismiss = () => {
    clearError();
    onDismiss?.();
  };

  const ERROR_MAP: Record<string, any> = {
    microphone_permission: { title: 'voice.permission_error', desc: 'voice.permission_description', icon: '🎙️' },
    microphone_unavailable: { title: 'voice.unavailable_error', desc: 'voice.unavailable_description', icon: '❌' },
    network_error: { title: 'voice.network_error', desc: 'voice.network_description', icon: '📡' },
    recognition_failed: { title: 'voice.recognition_error', desc: 'voice.recognition_description', icon: '🔊' },
    timeout: { title: 'voice.timeout_error', desc: 'voice.timeout_description', icon: '⏱️' },
  };

  const getErrorDetails = () => {
    const mapping = ERROR_MAP[error.type] || { title: 'voice.error', desc: 'voice.unknown_error', icon: '⚠️' };
    return {
      title: t(mapping.title, mapping.title),
      description: t(mapping.desc, error.message || 'Error occurred'),
      icon: mapping.icon,
    };
  };

  const details = getErrorDetails();

  return (
    <LinearGradient
      colors={['#7F1D1D', '#5B1920']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Error Icon */}
        <Text style={styles.icon}>{details.icon}</Text>

        {/* Error Title */}
        <Text style={styles.title}>{details.title}</Text>

        {/* Error Description */}
        <Text style={styles.description}>{details.description}</Text>

        {/* Additional Info */}
        {error.recoverable && (
          <Text style={styles.recoveryHint}>
            {t('voice.error_recoverable', 'This error can be recovered. Try again?')}
          </Text>
        )}

        {/* Button Container */}
        <View style={styles.buttonContainer}>
          {error.recoverable && (
            <Pressable
              onPress={handleRetry}
              onFocus={() => setFocusedButton('retry')}
              onBlur={() => setFocusedButton(null)}
              accessible
              accessibilityLabel={t('voice.retry', 'Retry')}
              style={[
                styles.button,
                styles.retryButton,
                {
                  borderColor:
                    focusedButton === 'retry' ? '#10B981' : 'transparent',
                  transform: [
                    { scale: focusedButton === 'retry' ? 1.05 : 1 },
                  ],
                },
              ]}
            >
              <Text style={styles.retryButtonText}>
                {t('voice.retry', 'Retry')}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleDismiss}
            onFocus={() => setFocusedButton('dismiss')}
            onBlur={() => setFocusedButton(null)}
            accessible
            accessibilityLabel={t('voice.dismiss', 'Dismiss')}
            style={[
              styles.button,
              styles.dismissButton,
              {
                borderColor:
                  focusedButton === 'dismiss' ? '#EF4444' : 'transparent',
                transform: [
                  { scale: focusedButton === 'dismiss' ? 1.05 : 1 },
                ],
              },
            ]}
          >
            <Text style={styles.dismissButtonText}>
              {t('voice.dismiss', 'Dismiss')}
            </Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 400,
    minHeight: 300,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FCA5A5',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 32,
  },
  recoveryHint: {
    fontSize: 18,
    fontWeight: '400',
    color: '#FCA5A5',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  button: { paddingHorizontal: 28, paddingVertical: 16, borderRadius: 12, borderWidth: 2, minHeight: 60, justifyContent: 'center', alignItems: 'center' },
  retryButton: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  retryButtonText: { fontSize: 24, fontWeight: '600', color: '#10B981' },
  dismissButton: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  dismissButtonText: { fontSize: 24, fontWeight: '600', color: '#FCA5A5' },
});

export default TVVoiceErrorAlert;
