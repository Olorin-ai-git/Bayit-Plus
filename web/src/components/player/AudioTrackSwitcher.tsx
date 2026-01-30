/**
 * AudioTrackSwitcher
 * Switch between original and dubbed audio during recording playback
 */

import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Volume2, Music, Check } from 'lucide-react'
import { GlassView } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import logger from '@/utils/logger'

export type AudioTrack = 'original' | 'dubbed'

interface AudioTrackSwitcherProps {
  activeTrack: AudioTrack
  onTrackChange: (track: AudioTrack) => void
  dubbedLanguage?: string
  visible: boolean
  onClose: () => void
}

export const AudioTrackSwitcher: React.FC<AudioTrackSwitcherProps> = ({
  activeTrack,
  onTrackChange,
  dubbedLanguage,
  visible,
  onClose,
}) => {
  const { t } = useTranslation()
  const { flexDirection, textAlign } = useDirection()

  if (!visible) return null

  const handleTrackSelect = (track: AudioTrack) => {
    logger.debug('Audio track changed', 'AudioTrackSwitcher', { track })
    onTrackChange(track)
    onClose()
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <GlassView style={styles.panel}>
        <Text style={[styles.title, { textAlign }]}>
          {t('recordings.audioTracks')}
        </Text>

        {/* Original Audio */}
        <Pressable
          style={[
            styles.trackRow,
            { flexDirection },
            activeTrack === 'original' && styles.trackRowActive,
          ]}
          onPress={() => handleTrackSelect('original')}
        >
          <View style={[styles.trackIcon, activeTrack === 'original' && styles.trackIconActive]}>
            <Music size={18} color={activeTrack === 'original' ? colors.text : colors.textSecondary} />
          </View>
          <View style={styles.trackInfo}>
            <Text style={[
              styles.trackName,
              { textAlign },
              activeTrack === 'original' && styles.trackNameActive,
            ]}>
              {t('recordings.originalAudio')}
            </Text>
            <Text style={[styles.trackDetail, { textAlign }]}>
              {t('recordings.originalAudioDesc')}
            </Text>
          </View>
          {activeTrack === 'original' && (
            <Check size={18} color={colors.primary} />
          )}
        </Pressable>

        {/* Dubbed Audio */}
        <Pressable
          style={[
            styles.trackRow,
            { flexDirection },
            activeTrack === 'dubbed' && styles.trackRowActive,
          ]}
          onPress={() => handleTrackSelect('dubbed')}
        >
          <View style={[styles.trackIcon, activeTrack === 'dubbed' && styles.trackIconActive]}>
            <Volume2 size={18} color={activeTrack === 'dubbed' ? colors.text : colors.textSecondary} />
          </View>
          <View style={styles.trackInfo}>
            <Text style={[
              styles.trackName,
              { textAlign },
              activeTrack === 'dubbed' && styles.trackNameActive,
            ]}>
              {t('recordings.dubbedAudio')}
            </Text>
            <Text style={[styles.trackDetail, { textAlign }]}>
              {dubbedLanguage
                ? t('recordings.dubbedAudioLang', { language: dubbedLanguage.toUpperCase() })
                : t('recordings.dubbedAudioDesc')}
            </Text>
          </View>
          {activeTrack === 'dubbed' && (
            <Check size={18} color={colors.primary} />
          )}
        </Pressable>
      </GlassView>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    zIndex: 100,
    marginBottom: spacing.sm,
  },
  backdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  panel: {
    width: 280,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  trackRow: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  trackRowActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  trackIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackIconActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  trackNameActive: {
    color: colors.text,
  },
  trackDetail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
})
