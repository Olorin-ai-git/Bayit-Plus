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
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
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
      className="mb-2"
    >
      <Animated.View
        className={`bg-white/5 rounded-lg p-${isTV ? '4' : '3'} border-2 ${
          isSelected ? 'bg-purple-500/20 border-purple-500' : 'border-transparent'
        } ${isFocused ? 'border-purple-500 bg-purple-500/30' : ''}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        <View className="flex-col">
          <Text className={`text-${isTV ? 'xl' : 'lg'} font-semibold text-white mb-1`} style={{ textAlign }}>
            {option.label}
            {isSelected && ' ✓'}
          </Text>
          <Text className={`text-${isTV ? 'base' : 'sm'} text-gray-300`} style={{ textAlign }}>
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
        className="flex-1 bg-black/80 justify-center items-center"
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          className={`${isTV ? 'w-1/2' : 'w-11/12'} max-w-[600px] bg-[#141414]/95 rounded-2xl border-2 border-purple-500/30 p-${isTV ? '6' : '5'}`}
          style={{ backdropFilter: 'blur(20px)' } as any}
        >
          <View className={`mb-${isTV ? '5' : '4'}`}>
            <Text className={`text-${isTV ? '3xl' : '2xl'} font-bold text-white mb-1`} style={{ textAlign }}>
              {t('player.playbackSpeed', 'Playback Speed')}
            </Text>
            {!isWeb && (
              <Text className={`text-${isTV ? 'sm' : 'xs'} text-orange-500 italic`} style={{ textAlign }}>
                {t(
                  'player.speedNotSupported',
                  'Note: Playback speed may not be supported on this platform'
                )}
              </Text>
            )}
          </View>

          <View className={`mb-${isTV ? '5' : '4'}`}>
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

          <View className={`bg-purple-500/10 rounded-lg p-${isTV ? '4' : '3'} mb-${isTV ? '5' : '4'}`}>
            <Text className={`text-${isTV ? 'sm' : 'xs'} text-gray-300 leading-${isTV ? '5' : '4'}`}>
              {t(
                'player.speedInfo',
                'Changing playback speed adjusts the video and audio speed while maintaining pitch'
              )}
            </Text>
          </View>

          <TouchableOpacity
            className={`bg-white/10 rounded-lg p-${isTV ? '4' : '3'} items-center mt-2`}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text className={`text-${isTV ? 'lg' : 'base'} font-semibold text-white`}>
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

export default PlaybackSpeedControl;
