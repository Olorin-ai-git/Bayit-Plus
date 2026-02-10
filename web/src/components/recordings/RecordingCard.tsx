/**
 * RecordingCard Component
 * Display individual recording with Glass components only
 */

import React from 'react'
import { View, Text, Image, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play, Trash2, Calendar, HardDrive, Volume2, Repeat, Subtitles } from 'lucide-react'
import { useNavigation } from '@react-navigation/native'
import { GlassView } from '@bayit/shared/ui'
import { NativeIcon } from '@olorin/shared-icons/native'
import { colors } from '@olorin/design-tokens'
import { Recording } from '@/services/recordingApi'
import { useNotifications } from '@olorin/glass-ui/hooks'
import logger from '@/utils/logger'
import { styles } from './RecordingCard.styles'

interface RecordingCardProps {
  recording: Recording
  onDelete: (recordingId: string) => void
  formatBytes: (bytes: number) => string
  formatDuration: (seconds: number) => string
  formatDate: (dateStr: string) => string
}

export const RecordingCard: React.FC<RecordingCardProps> = ({
  recording, onDelete, formatBytes, formatDuration, formatDate,
}) => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const notifications = useNotifications()

  const handlePlay = () => {
    // @ts-ignore - navigation typing
    navigation.navigate('WatchRecording', { recordingId: recording.id })
  }

  const handleDelete = () => {
    notifications.show({
      level: 'warning',
      title: t('recordings.deleteRecording'),
      message: t('recordings.confirmDelete'),
      action: {
        label: t('common.delete'),
        type: 'action' as const,
        onPress: () => {
          logger.info('Recording deletion confirmed', 'RecordingCard', { id: recording.id })
          onDelete(recording.id)
        },
      },
      dismissable: true,
    })
  }

  return (
    <GlassView style={styles.card}>
      <Pressable onPress={handlePlay} style={styles.imageContainer}>
        {recording.thumbnail ? (
          <Image source={{ uri: recording.thumbnail }} style={styles.image} resizeMode="cover" />
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
          <Text style={styles.metaText}>{formatDate(recording.recorded_at)}</Text>
        </View>

        <View style={styles.metaRow}>
          <HardDrive size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatBytes(recording.file_size_bytes)}</Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.metaText}>{t('recordings.expires')} {formatDate(recording.auto_delete_at)}</Text>
        </View>

        <FeatureBadges recording={recording} />

        <View style={styles.actions}>
          <Pressable onPress={handlePlay} style={styles.playButton}>
            <Play size={16} color="white" fill="white" />
            <Text style={styles.playButtonText}>{t('common.play')}</Text>
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Trash2 size={16} color={colors.error.DEFAULT} />
          </Pressable>
        </View>
      </View>
    </GlassView>
  )
}

const FeatureBadges: React.FC<{ recording: Recording }> = ({ recording }) => {
  const { t } = useTranslation()

  return (
    <View style={styles.featureBadges}>
      {recording.subtitle_url && (
        <View style={styles.subtitleBadge}>
          <Subtitles size={12} color={colors.primary.DEFAULT} />
          <Text style={styles.subtitleText}>{t('recordings.subtitlesAvailable')}</Text>
        </View>
      )}
      {recording.dubbed_audio_url && (
        <View style={styles.dubbedBadge}>
          <Volume2 size={12} color="#22c55e" />
          <Text style={styles.dubbedText}>
            {recording.dubbed_audio_language
              ? t('recordings.dubbedAudioLang', { language: recording.dubbed_audio_language.toUpperCase() })
              : t('recordings.dubbedAudio')}
          </Text>
        </View>
      )}
      {recording.series_rule_id && (
        <View style={styles.seriesBadge}>
          <Repeat size={12} color="#a855f7" />
          <Text style={styles.seriesText}>{t('recordings.seriesRecording')}</Text>
        </View>
      )}
    </View>
  )
}
