import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { isTV, isWeb } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';

export interface AudioTrack {
  id: string;
  language: string;
  languageCode: string;
  label?: string;
  format?: string;
  channels?: string;
  bitrate?: number;
  isDefault?: boolean;
}

export interface AudioTrackSelectorProps {
  visible: boolean;
  onClose: () => void;
  audioTracks: AudioTrack[];
  selectedTrackId: string;
  onTrackChange: (trackId: string) => void;
}

const AudioTrackOption: React.FC<{
  track: AudioTrack;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}> = ({ track, isSelected, onPress, index }) => {
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

  const formatBitrate = (bitrate?: number): string => {
    if (!bitrate) return '';
    if (bitrate >= 1000) return `${(bitrate / 1000).toFixed(0)} kbps`;
    return `${bitrate} bps`;
  };

  const formatChannels = (channels?: string): string => {
    if (!channels) return '';
    const channelMap: Record<string, string> = {
      '1': 'Mono',
      '2': 'Stereo',
      '6': '5.1 Surround',
      '8': '7.1 Surround',
    };
    return channelMap[channels] || channels;
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
        className="rounded-lg border-2"
        style={[
          {
            transform: [{ scale: scaleAnim }],
            backgroundColor: isSelected ? colors.glassBorder : colors.glassBorderWhite,
            borderColor: (isSelected || isFocused) ? colors.primary : 'transparent',
            padding: isTV ? spacing.lg : spacing.md,
            ...(isFocused && { boxShadow: `0 0 20px ${colors.glassGlowStrong}` }),
          }
        ]}
      >
        <View className="flex-col">
          <View className="flex-row justify-between items-center mb-1">
            <Text className={`flex-1 text-lg font-semibold text-white ${isTV ? 'text-xl' : 'text-lg'}`} style={{ textAlign }}>
              {track.language}
              {isSelected && ' ✓'}
              {track.isDefault && ' (Default)'}
            </Text>
            {track.languageCode && (
              <Text className={`font-semibold text-white/70 bg-white/10 px-2 py-1 rounded ${isTV ? 'text-sm' : 'text-xs'}`}>
                {track.languageCode.toUpperCase()}
              </Text>
            )}
          </View>

          {(track.format || track.channels || track.bitrate) && (
            <View className="flex-row flex-wrap gap-2 mb-1">
              {track.format && <Text className={`text-white/70 bg-white/10 px-2 py-0.5 rounded ${isTV ? 'text-sm' : 'text-xs'}`}>{track.format}</Text>}
              {track.channels && (
                <Text className={`text-white/70 bg-white/10 px-2 py-0.5 rounded ${isTV ? 'text-sm' : 'text-xs'}`}>{formatChannels(track.channels)}</Text>
              )}
              {track.bitrate && (
                <Text className={`text-white/70 bg-white/10 px-2 py-0.5 rounded ${isTV ? 'text-sm' : 'text-xs'}`}>{formatBitrate(track.bitrate)}</Text>
              )}
            </View>
          )}

          {track.label && <Text className={`text-white/50 italic ${isTV ? 'text-sm' : 'text-xs'}`}>{track.label}</Text>}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const AudioTrackSelector: React.FC<AudioTrackSelectorProps> = ({
  visible,
  onClose,
  audioTracks,
  selectedTrackId,
  onTrackChange,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const handleTrackSelect = (trackId: string) => {
    onTrackChange(trackId);
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
          className={`${isTV ? 'w-1/2' : 'w-11/12'} max-w-[600px] ${isTV ? 'max-h-[70%]' : 'max-h-[80%]'} bg-white/10 backdrop-blur-xl rounded-2xl border-2 border-white/20`}
          style={{ padding: isTV ? spacing.xl : spacing.lg }}
        >
          <View className={isTV ? 'mb-6' : 'mb-4'}>
            <Text className={`font-bold text-white mb-1 ${isTV ? 'text-[32px]' : 'text-2xl'}`} style={{ textAlign }}>
              {t('player.audioTrack', 'Audio Track')}
            </Text>
            <Text className={`text-white/70 ${isTV ? 'text-base' : 'text-sm'}`} style={{ textAlign }}>
              {t('player.selectAudioTrack', 'Select your preferred audio track')}
            </Text>
          </View>

          <ScrollView
            className={`flex-1 ${isTV ? 'mb-6' : 'mb-4'}`}
            showsVerticalScrollIndicator={false}
          >
            {audioTracks.length === 0 ? (
              <View className={`items-center justify-center ${isTV ? 'p-8' : 'p-6'}`}>
                <Text className={`text-white/70 text-center ${isTV ? 'text-lg' : 'text-base'}`}>
                  {t('player.noAudioTracks', 'No audio tracks available')}
                </Text>
              </View>
            ) : (
              audioTracks.map((track, index) => (
                <AudioTrackOption
                  key={track.id}
                  track={track}
                  isSelected={selectedTrackId === track.id}
                  onPress={() => handleTrackSelect(track.id)}
                  index={index}
                />
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            className={`bg-white/10 rounded-lg items-center mt-2 ${isTV ? 'p-4' : 'p-3'}`}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text className={`font-semibold text-white ${isTV ? 'text-lg' : 'text-base'}`}>
              {t('common.close', 'Close')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default AudioTrackSelector;
