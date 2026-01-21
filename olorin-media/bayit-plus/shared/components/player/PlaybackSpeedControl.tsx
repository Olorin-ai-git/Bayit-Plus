import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { isTV, isWeb } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

export interface PlaybackSpeedControlProps {
  visible: boolean;
  onClose: () => void;
  currentSpeed: PlaybackSpeed;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}

const SPEED_OPTIONS: { value: PlaybackSpeed; label: string; description: string }[] = [
  { value: 0.5, label: '0.5x', description: 'Half speed' },
  { value: 0.75, label: '0.75x', description: 'Slow' },
  { value: 1, label: '1x', description: 'Normal' },
  { value: 1.25, label: '1.25x', description: 'Slightly faster' },
  { value: 1.5, label: '1.5x', description: 'Fast' },
  { value: 2, label: '2x', description: 'Double speed' },
];

const STORAGE_KEY = 'bayit_playback_speed_preference';

const SpeedOption: React.FC<{
  option: { value: PlaybackSpeed; label: string; description: string };
  isSelected: boolean;
  onPress: () => void;
  index: number;
}> = ({ option, isSelected, onPress, index }) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.7}
      style={styles.optionTouchable}
    >
      <Animated.View
        style={[
          styles.option,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.optionSelected,
          isFocused && styles.optionFocused,
        ]}
      >
        <View style={styles.optionContent}>
          <Text style={[styles.optionLabel, { textAlign }]}>
            {option.label}
            {isSelected && ' ✓'}
          </Text>
          <Text style={[styles.optionDescription, { textAlign }]}>
            {option.description}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const PlaybackSpeedControl: React.FC<PlaybackSpeedControlProps> = ({
  visible,
  onClose,
  currentSpeed,
  onSpeedChange,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const handleSpeedSelect = async (speed: PlaybackSpeed) => {
    // Save preference to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, speed.toString());
    } catch (error) {
      console.error('Failed to save playback speed preference:', error);
    }

    onSpeedChange(speed);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { textAlign }]}>
              {t('player.playbackSpeed', 'Playback Speed')}
            </Text>
            {!isWeb && (
              <Text style={[styles.warning, { textAlign }]}>
                {t(
                  'player.speedNotSupported',
                  'Note: Playback speed may not be supported on this platform'
                )}
              </Text>
            )}
          </View>

          <View style={styles.optionsContainer}>
            {SPEED_OPTIONS.map((option, index) => (
              <SpeedOption
                key={option.value}
                option={option}
                isSelected={currentSpeed === option.value}
                onPress={() => handleSpeedSelect(option.value)}
                index={index}
              />
            ))}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              {t(
                'player.speedInfo',
                'Changing playback speed adjusts the video and audio speed while maintaining pitch'
              )}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>
              {t('common.close', 'Close')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * Hook to get saved playback speed preference
 */
export const usePlaybackSpeedPreference = (): PlaybackSpeed => {
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedSpeed = parseFloat(saved) as PlaybackSpeed;
          if (SPEED_OPTIONS.some((opt) => opt.value === parsedSpeed)) {
            setSpeed(parsedSpeed);
          }
        }
      } catch (error) {
        console.error('Failed to load playback speed preference:', error);
      }
    };

    loadPreference();
  }, []);

  return speed;
};

/**
 * Check if playback speed is supported on current platform
 */
export const isPlaybackSpeedSupported = (): boolean => {
  // Playback speed is supported on web via HTML5 Video API
  // React Native Video support varies by platform
  // For now, we'll assume it's primarily a web feature
  return isWeb;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: isTV ? '50%' : '90%',
    maxWidth: 600,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    padding: isTV ? spacing.xl : spacing.lg,
    // @ts-ignore - Web CSS property
    backdropFilter: 'blur(20px)',
  },
  header: {
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  title: {
    fontSize: isTV ? 32 : 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  warning: {
    fontSize: isTV ? 14 : 12,
    color: colors.warning || '#FFA500',
    fontStyle: 'italic',
  },
  optionsContainer: {
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  optionTouchable: {
    marginBottom: spacing.sm,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: isTV ? spacing.lg : spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary,
  },
  optionFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    // @ts-ignore - Web CSS property
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
  },
  optionContent: {
    flexDirection: 'column',
  },
  optionLabel: {
    fontSize: isTV ? 22 : 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  infoSection: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.lg,
    padding: isTV ? spacing.md : spacing.sm,
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  infoText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    lineHeight: isTV ? 20 : 18,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: isTV ? spacing.md : spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  closeButtonText: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
  },
});

export default PlaybackSpeedControl;
