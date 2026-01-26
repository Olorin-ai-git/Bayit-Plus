/**
 * TV Voice Response Display Component
 * Full-screen overlay showing voice command responses and feedback
 * Auto-dismisses after configurable duration
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useVoiceStore } from '../../stores/voiceStore';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';

interface TVVoiceResponseDisplayProps {
  autoDismissMs?: number;
  onDismiss?: () => void;
}

export const TVVoiceResponseDisplay: React.FC<TVVoiceResponseDisplayProps> = ({
  autoDismissMs = 5000,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const { lastResponse, error } = useVoiceStore();
  const [visible, setVisible] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get('window');

  const content = lastResponse || error;

  useEffect(() => {
    if (content) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const dismissTimer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          onDismiss?.();
        });
      }, autoDismissMs);

      return () => clearTimeout(dismissTimer);
    }
  }, [content, fadeAnim, autoDismissMs, onDismiss]);

  if (!visible || !content) {
    return null;
  }

  const isError = 'type' in content && content.type === 'error';
  const message = 'message' in content ? content.message : '';
  const bgColor = isError ? '#7F1D1D' : '#1F2937';
  const borderColor = isError ? '#DC2626' : '#A855F7';
  const accentColor = isError ? '#FCA5A5' : '#A855F7';

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          width,
          height,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.centerContainer}>
        <LinearGradient
          colors={[`${bgColor}CC`, `${bgColor}99`]}
          style={[
            styles.responseCard,
            {
              borderColor,
            },
          ]}
        >
          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: accentColor,
              },
            ]}
          >
            {isError
              ? t('voice.error_title', 'Voice Command Error')
              : t('voice.response_title', 'Response')}
          </Text>

          {/* Message */}
          <Text
            style={[
              styles.message,
              {
                color: '#FFFFFF',
              },
            ]}
          >
            {message}
          </Text>

          {/* Icon/Status */}
          <Text style={styles.statusIcon}>
            {isError ? '❌' : '✓'}
          </Text>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9000,
  },
  centerContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responseCard: {
    width: 600,
    minHeight: 300,
    paddingHorizontal: 48,
    paddingVertical: 60,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  message: {
    fontSize: 28,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 40,
  },
  statusIcon: {
    fontSize: 56,
  },
});

export default TVVoiceResponseDisplay;
