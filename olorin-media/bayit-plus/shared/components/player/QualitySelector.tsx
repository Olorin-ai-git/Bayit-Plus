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

export type QualityLevel = 'auto' | '1080p' | '720p' | '480p' | '360p';

export interface QualitySelectorProps {
  visible: boolean;
  onClose: () => void;
  currentQuality: QualityLevel;
  onQualityChange: (quality: QualityLevel) => void;
  availableQualities?: QualityLevel[];
}

const QUALITY_OPTIONS: { value: QualityLevel; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'Adjust quality based on network' },
  { value: '1080p', label: '1080p', description: 'Full HD (1920x1080)' },
  { value: '720p', label: '720p', description: 'HD (1280x720)' },
  { value: '480p', label: '480p', description: 'SD (854x480)' },
  { value: '360p', label: '360p', description: 'Low (640x360)' },
];

const STORAGE_KEY = 'bayit_video_quality_preference';

const QualityOption: React.FC<{
  option: { value: QualityLevel; label: string; description: string };
  isSelected: boolean;
  isAvailable: boolean;
  onPress: () => void;
  index: number;
}> = ({ option, isSelected, isAvailable, onPress, index }) => {
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

  if (!isAvailable) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={!isAvailable}
      activeOpacity={0.7}
      style={styles.optionTouchable}
    >
      <Animated.View
        style={[
          styles.option,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.optionSelected,
          isFocused && styles.optionFocused,
          !isAvailable && styles.optionDisabled,
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

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  visible,
  onClose,
  currentQuality,
  onQualityChange,
  availableQualities = ['auto', '1080p', '720p', '480p', '360p'],
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const handleQualitySelect = async (quality: QualityLevel) => {
    // Save preference to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, quality);
    } catch (error) {
      console.error('Failed to save quality preference:', error);
    }

    onQualityChange(quality);
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
              {t('player.selectQuality', 'Video Quality')}
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {QUALITY_OPTIONS.map((option, index) => (
              <QualityOption
                key={option.value}
                option={option}
                isSelected={currentQuality === option.value}
                isAvailable={availableQualities.includes(option.value)}
                onPress={() => handleQualitySelect(option.value)}
                index={index}
              />
            ))}
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
 * Hook to get saved quality preference
 */
export const useQualityPreference = () => {
  const [quality, setQuality] = useState<QualityLevel>('auto');

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && (saved as QualityLevel)) {
          setQuality(saved as QualityLevel);
        }
      } catch (error) {
        console.error('Failed to load quality preference:', error);
      }
    };

    loadPreference();
  }, []);

  return quality;
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
  optionDisabled: {
    opacity: 0.3,
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

export default QualitySelector;
