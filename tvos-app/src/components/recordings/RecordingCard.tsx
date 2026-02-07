/** RecordingCard - Individual recording card for tvOS grid */

import React from 'react'
import { View, Text, Pressable, Image } from 'react-native'
import { Play, HardDrive, Volume2, Repeat, Subtitles } from 'lucide-react-native'
import { colors } from '@olorin/design-tokens'
import { Recording } from '@bayit/shared-services/recordingApi'
import styles from './styles/RecordingCard.styles'

interface RecordingCardProps {
  item: Recording
  isFocused: boolean
  onPress: () => void
  onFocus: () => void
  onBlur: () => void
}

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const formatBytes = (b: number) => {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`
  return b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`
}

export const RecordingCard: React.FC<RecordingCardProps> = ({
  item, isFocused, onPress, onFocus, onBlur,
}) => (
  <Pressable
    focusable
    onPress={onPress}
    onFocus={onFocus}
    onBlur={onBlur}
    style={[styles.card, isFocused && styles.cardFocused]}
    hasTVPreferredFocus={false}
    accessibilityLabel={`${item.title}, ${formatDuration(item.duration_seconds)}`}
    accessibilityRole="button"
  >
    <View style={styles.thumbnailContainer}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Play size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.durationOverlay}>
        <Text style={styles.durationText}>{formatDuration(item.duration_seconds)}</Text>
      </View>
    </View>

    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.cardMeta}>
        <HardDrive size={12} color={colors.textMuted} />
        <Text style={styles.cardMetaText}>{formatBytes(item.file_size_bytes)}</Text>
      </View>
      <View style={styles.badgeRow}>
        {item.dubbed_audio_url && (
          <View style={styles.tvBadge}><Volume2 size={16} color="#22c55e" /></View>
        )}
        {item.subtitle_url && (
          <View style={styles.tvBadge}><Subtitles size={16} color={colors.primary} /></View>
        )}
        {item.series_rule_id && (
          <View style={styles.tvBadge}><Repeat size={16} color="#a855f7" /></View>
        )}
      </View>
    </View>

    {isFocused && <View style={styles.focusRing} />}
  </Pressable>
)
