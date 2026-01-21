import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
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
      style={styles.trackTouchable}
    >
      <Animated.View
        style={[
          styles.track,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.trackSelected,
          isFocused && styles.trackFocused,
        ]}
      >
        <View style={styles.trackContent}>
          <View style={styles.trackHeader}>
            <Text style={[styles.trackLanguage, { textAlign }]}>
              {track.language}
              {isSelected && ' ✓'}
              {track.isDefault && ' (Default)'}
            </Text>
            {track.languageCode && (
              <Text style={styles.trackCode}>{track.languageCode.toUpperCase()}</Text>
            )}
          </View>

          {(track.format || track.channels || track.bitrate) && (
            <View style={styles.trackDetails}>
              {track.format && <Text style={styles.trackDetail}>{track.format}</Text>}
              {track.channels && (
                <Text style={styles.trackDetail}>{formatChannels(track.channels)}</Text>
              )}
              {track.bitrate && (
                <Text style={styles.trackDetail}>{formatBitrate(track.bitrate)}</Text>
              )}
            </View>
          )}

          {track.label && <Text style={styles.trackLabel}>{track.label}</Text>}
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
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { textAlign }]}>
              {t('player.audioTrack', 'Audio Track')}
            </Text>
            <Text style={[styles.subtitle, { textAlign }]}>
              {t('player.selectAudioTrack', 'Select your preferred audio track')}
            </Text>
          </View>

          <ScrollView
            style={styles.tracksContainer}
            showsVerticalScrollIndicator={false}
          >
            {audioTracks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.glassOverlayStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: isTV ? '50%' : '90%',
    maxWidth: 600,
    maxHeight: isTV ? '70%' : '80%',
    backgroundColor: colors.glassStrong,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.glassBorderStrong,
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
  subtitle: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  tracksContainer: {
    flex: 1,
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  trackTouchable: {
    marginBottom: spacing.sm,
  },
  track: {
    backgroundColor: colors.glassBorderWhite,
    borderRadius: borderRadius.lg,
    padding: isTV ? spacing.lg : spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  trackSelected: {
    backgroundColor: colors.glassBorder,
    borderColor: colors.primary,
  },
  trackFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.glassBorderStrong,
    // @ts-ignore - Web CSS property
    boxShadow: `0 0 20px ${colors.glassGlowStrong}`,
  },
  trackContent: {
    flexDirection: 'column',
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  trackLanguage: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  trackCode: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.glassBorderWhite,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  trackDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  trackDetail: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    backgroundColor: colors.glassBorderWhite,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  trackLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: isTV ? spacing.xl : spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: isTV ? 18 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: colors.glassBorderWhite,
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

export default AudioTrackSelector;
