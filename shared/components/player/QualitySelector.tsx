import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
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
      className="mb-2"
    >
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
        ]}
        className={`
          ${isTV ? 'p-4' : 'p-3'} rounded-lg border-2
          ${isSelected ? 'bg-purple-700/20 border-purple-500' : 'bg-white/5 border-transparent'}
          ${isFocused ? 'border-purple-500 bg-purple-700/30' : ''}
          ${!isAvailable ? 'opacity-30' : ''}
        `}
      >
        <View className="flex-col">
          <Text className={`${isTV ? 'text-[22px]' : 'text-lg'} font-semibold text-white mb-1`} style={{ textAlign }}>
            {option.label}
            {isSelected && ' ✓'}
          </Text>
          <Text className={`${isTV ? 'text-base' : 'text-sm'} text-gray-400`} style={{ textAlign }}>
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
        className="flex-1 bg-black/80 justify-center items-center"
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          className={`bg-[rgba(20,20,20,0.95)] rounded-2xl border-2 border-purple-700/30 backdrop-blur-xl`}
          style={{
            width: isTV ? '50%' : '90%',
            maxWidth: 600,
            padding: isTV ? spacing.xl : spacing.lg,
          }}
        >
          <View className={`${isTV ? 'mb-4' : 'mb-3'}`}>
            <Text className={`${isTV ? 'text-[32px]' : 'text-2xl'} font-bold text-white`} style={{ textAlign }}>
              {t('player.selectQuality', 'Video Quality')}
            </Text>
          </View>

          <View className={`${isTV ? 'mb-4' : 'mb-3'}`}>
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
            className={`bg-white/10 rounded-lg items-center mt-2`}
            style={{ padding: isTV ? spacing.md : spacing.sm }}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text className={`${isTV ? 'text-lg' : 'text-base'} font-semibold text-white`}>
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

export default QualitySelector;
