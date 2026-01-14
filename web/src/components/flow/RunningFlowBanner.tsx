/**
 * RunningFlowBanner - Global banner showing active flow
 * Displayed at the top of the Layout when a flow is running
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipForward, X, ChevronDown, ChevronUp } from 'lucide-react';
import { colors, spacing } from '@bayit/shared/theme';
import { useFlowStore } from '@/stores/flowStore';
import { useDirection } from '@/hooks/useDirection';

declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

export default function RunningFlowBanner() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const { runningFlow, pauseFlow, resumeFlow, nextItem, stopFlow } = useFlowStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedBtn, setFocusedBtn] = useState<string | null>(null);

  if (!runningFlow) return null;

  const currentItem = runningFlow.items[runningFlow.currentIndex];
  const progress = ((runningFlow.currentIndex + 1) / runningFlow.items.length) * 100;
  const hasNext = runningFlow.currentIndex < runningFlow.items.length - 1;

  const handlePlayPause = () => {
    if (runningFlow.isPaused) {
      resumeFlow();
    } else {
      pauseFlow();
    }
  };

  const handleOpenPlayer = () => {
    navigate('/player', { state: { flowId: runningFlow.id } });
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Main Banner */}
      <View style={[styles.banner, isExpanded && styles.bannerExpanded]}>
        <Pressable
          onPress={handleOpenPlayer}
          style={[styles.mainContent, isRTL && styles.mainContentRTL]}
        >
          {/* Thumbnail */}
          {currentItem?.thumbnail ? (
            <Image source={{ uri: currentItem.thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Play size={IS_TV_BUILD ? 24 : 16} color={colors.primary} />
            </View>
          )}

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.flowLabel}>
              <View style={styles.liveDot} />
              <Text style={styles.flowLabelText}>{runningFlow.name}</Text>
            </View>
            <Text style={[styles.itemTitle, isRTL && styles.textRTL]} numberOfLines={1}>
              {currentItem?.title || t('flows.loading')}
            </Text>
            <Text style={styles.progress}>
              {runningFlow.currentIndex + 1} / {runningFlow.items.length}
            </Text>
          </View>
        </Pressable>

        {/* Controls */}
        <View style={[styles.controls, isRTL && styles.controlsRTL]}>
          {/* Play/Pause */}
          <Pressable
            onPress={handlePlayPause}
            onFocus={() => setFocusedBtn('play')}
            onBlur={() => setFocusedBtn(null)}
            style={[styles.controlBtn, focusedBtn === 'play' && styles.controlBtnFocused]}
          >
            {runningFlow.isPaused ? (
              <Play size={IS_TV_BUILD ? 24 : 20} color={colors.text} fill={colors.text} />
            ) : (
              <Pause size={IS_TV_BUILD ? 24 : 20} color={colors.text} fill={colors.text} />
            )}
          </Pressable>

          {/* Next */}
          {hasNext && (
            <Pressable
              onPress={nextItem}
              onFocus={() => setFocusedBtn('next')}
              onBlur={() => setFocusedBtn(null)}
              style={[styles.controlBtn, focusedBtn === 'next' && styles.controlBtnFocused]}
            >
              <SkipForward size={IS_TV_BUILD ? 24 : 20} color={colors.text} />
            </Pressable>
          )}

          {/* Expand/Collapse */}
          <Pressable
            onPress={() => setIsExpanded(!isExpanded)}
            onFocus={() => setFocusedBtn('expand')}
            onBlur={() => setFocusedBtn(null)}
            style={[styles.controlBtn, focusedBtn === 'expand' && styles.controlBtnFocused]}
          >
            {isExpanded ? (
              <ChevronUp size={IS_TV_BUILD ? 24 : 20} color={colors.text} />
            ) : (
              <ChevronDown size={IS_TV_BUILD ? 24 : 20} color={colors.text} />
            )}
          </Pressable>

          {/* Stop */}
          <Pressable
            onPress={stopFlow}
            onFocus={() => setFocusedBtn('stop')}
            onBlur={() => setFocusedBtn(null)}
            style={[styles.controlBtn, styles.stopBtn, focusedBtn === 'stop' && styles.stopBtnFocused]}
          >
            <X size={IS_TV_BUILD ? 24 : 20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Expanded Playlist */}
      {isExpanded && (
        <View style={styles.playlist}>
          {runningFlow.items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => useFlowStore.getState().setCurrentIndex(index)}
              style={[
                styles.playlistItem,
                index === runningFlow.currentIndex && styles.playlistItemActive,
                isRTL && styles.playlistItemRTL,
              ]}
            >
              <Text style={styles.playlistIndex}>{index + 1}</Text>
              <Text
                style={[
                  styles.playlistTitle,
                  index === runningFlow.currentIndex && styles.playlistTitleActive,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {index === runningFlow.currentIndex && (
                <View style={styles.playingIndicator}>
                  <View style={styles.playingDot} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10, 10, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 85, 247, 0.6)',
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
  },
  bannerExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_TV_BUILD ? spacing.md : spacing.sm,
  },
  mainContentRTL: {
    flexDirection: 'row-reverse',
  },
  thumbnail: {
    width: IS_TV_BUILD ? 80 : 56,
    height: IS_TV_BUILD ? 45 : 32,
    borderRadius: 6,
  },
  thumbnailPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  flowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  flowLabelText: {
    fontSize: IS_TV_BUILD ? 14 : 11,
    fontWeight: '600',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemTitle: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  progress: {
    fontSize: IS_TV_BUILD ? 14 : 12,
    color: colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_TV_BUILD ? spacing.sm : spacing.xs,
  },
  controlsRTL: {
    flexDirection: 'row-reverse',
  },
  controlBtn: {
    width: IS_TV_BUILD ? 48 : 36,
    height: IS_TV_BUILD ? 48 : 36,
    borderRadius: IS_TV_BUILD ? 24 : 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  controlBtnFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  stopBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  stopBtnFocused: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  playlist: {
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
    maxHeight: IS_TV_BUILD ? 300 : 200,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: IS_TV_BUILD ? spacing.sm : spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    gap: spacing.sm,
  },
  playlistItemActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  playlistItemRTL: {
    flexDirection: 'row-reverse',
  },
  playlistIndex: {
    width: 24,
    fontSize: IS_TV_BUILD ? 14 : 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  playlistTitle: {
    flex: 1,
    fontSize: IS_TV_BUILD ? 16 : 14,
    color: colors.textSecondary,
  },
  playlistTitleActive: {
    color: colors.text,
    fontWeight: '600',
  },
  playingIndicator: {
    width: 20,
    alignItems: 'center',
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  textRTL: {
    textAlign: 'right',
  },
});
