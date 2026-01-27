/**
 * RecordingCard Component
 * Display individual recording with Glass components only
 */

import React from 'react'
import { View, Text, StyleSheet, Image, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play, Trash2, Calendar, HardDrive } from 'lucide-react'
import { useNavigation } from '@react-navigation/native'
import { GlassView } from '@bayit/shared/ui'
import { NativeIcon } from '@olorin/shared-icons/native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { Recording } from '@/services/recordingApi'
import { useModal } from '@/contexts/ModalContext'

interface RecordingCardProps {
  recording: Recording
  onDelete: (recordingId: string) => void
  formatBytes: (bytes: number) => string
  formatDuration: (seconds: number) => string
  formatDate: (dateStr: string) => string
}

export const RecordingCard: React.FC<RecordingCardProps> = ({
  recording,
  onDelete,
  formatBytes,
  formatDuration,
  formatDate
}) => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { showConfirm } = useModal()

  const handlePlay = () => {
    // @ts-ignore
    navigation.navigate('WatchRecording', { recordingId: recording.id })
  }

  const handleDelete = () => {
    showConfirm(
      t('recordings.confirmDelete'),
      () => onDelete(recording.id),
      {
        title: t('recordings.deleteRecording'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        destructive: true
      }
    )
  }

  return (
    <GlassView style={styles.card}>
      <Pressable onPress={handlePlay} style={styles.imageContainer}>
        {recording.thumbnail ? (
          <Image
            source={{ uri: recording.thumbnail }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <NativeIcon name="vod" size="lg" color={colors.textMuted} />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(recording.duration_seconds)}</Text>
        </View>
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{recording.title}</Text>

        <View style={styles.metaRow}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {formatDate(recording.recorded_at)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <HardDrive size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {formatBytes(recording.file_size_bytes)}
          </Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.metaText}>
            {t('recordings.expires')} {formatDate(recording.auto_delete_at)}
          </Text>
        </View>

        {recording.subtitle_url && (
          <View style={styles.subtitleBadge}>
            <Text style={styles.subtitleText}>{t('recordings.subtitlesAvailable')}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable onPress={handlePlay} style={styles.playButton}>
            <Play size={16} color="white" fill="white" />
            <Text style={styles.playButtonText}>{t('common.play')}</Text>
          </Pressable>

          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Trash2 size={16} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaSeparator: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  subtitleBadge: {
    backgroundColor: `${colors.primary}30`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  subtitleText: {
    color: colors.primary.DEFAULT,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  playButton: {
    flex: 1,
    backgroundColor: colors.primary.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  playButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: `${colors.error}20`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
