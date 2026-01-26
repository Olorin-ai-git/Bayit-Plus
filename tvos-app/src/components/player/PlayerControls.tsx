/**
 * PlayerControls - TV player control bar
 *
 * Features:
 * - Play/Pause button
 * - Seek buttons (±10s, ±30s)
 * - Progress bar
 * - Time indicators
 * - Info/Exit buttons
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Pause, SkipBack, SkipForward, X, Info } from 'lucide-react-native';
import { PlayerProgressBar } from './PlayerProgressBar';
import { config } from '../../config/appConfig';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onExit: () => void;
  onToggleInfo: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onExit,
  onToggleInfo,
}) => {
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Top Bar - Exit */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.exitButton}
          onPress={onExit}
          accessible
          accessibilityLabel="Exit player"
          accessibilityRole="button"
        >
          <X size={28} color="#ffffff" />
        </Pressable>
      </View>

      {/* Bottom Control Bar */}
      <View style={styles.bottomBar}>
        {/* Progress Bar */}
        <PlayerProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={(time) => onSeek(time - currentTime)}
        />

        {/* Control Buttons */}
        <View style={styles.controlsRow}>
          {/* Left Controls */}
          <View style={styles.leftControls}>
            {/* Seek Backward 10s */}
            <Pressable
              style={styles.controlButton}
              onPress={() => onSeek(-10)}
              accessible
              accessibilityLabel="Rewind 10 seconds"
            >
              <SkipBack size={32} color="#ffffff" />
              <Text style={styles.seekLabel}>10s</Text>
            </Pressable>

            {/* Play/Pause */}
            <Pressable
              style={[styles.controlButton, styles.playPauseButton]}
              onPress={onPlayPause}
              accessible
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              hasTVPreferredFocus
            >
              {isPlaying ? (
                <Pause size={40} color="#ffffff" />
              ) : (
                <Play size={40} color="#ffffff" />
              )}
            </Pressable>

            {/* Seek Forward 30s */}
            <Pressable
              style={styles.controlButton}
              onPress={() => onSeek(30)}
              accessible
              accessibilityLabel="Forward 30 seconds"
            >
              <SkipForward size={32} color="#ffffff" />
              <Text style={styles.seekLabel}>30s</Text>
            </Pressable>
          </View>

          {/* Center - Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeSeparator}>/</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Right Controls */}
          <View style={styles.rightControls}>
            {/* Info Button */}
            <Pressable
              style={styles.controlButton}
              onPress={onToggleInfo}
              accessible
              accessibilityLabel="Show info"
            >
              <Info size={28} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: config.tv.safeZoneMarginPt,
    paddingVertical: config.tv.safeZoneMarginPt,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  exitButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bottomBar: {
    gap: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  seekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },
});
