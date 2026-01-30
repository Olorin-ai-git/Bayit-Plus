/**
 * RecordingsScreenTV
 * tvOS recordings screen with 4-column focus-navigable grid
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, FlatList, Pressable, StyleSheet, Image,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Circle, Play, HardDrive, Volume2, Repeat, Subtitles,
} from 'lucide-react-native'
import { TVHeader } from '../components/TVHeader'
import { colors, spacing, borderRadius, fontSizeTV } from '@olorin/design-tokens'
import { recordingApi, Recording, RecordingQuota } from '@bayit/shared-services/recordingApi'
import logger from '@/utils/logger'

const TV_GRID_COLUMNS = 4
const TV_CARD_HEIGHT = 220

type FilterType = 'all' | 'manual' | 'scheduled' | 'series'

interface RecordingsScreenTVProps {
  navigation: any
}

export const RecordingsScreenTV: React.FC<RecordingsScreenTVProps> = ({ navigation }) => {
  const { t } = useTranslation()

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [quota, setQuota] = useState<RecordingQuota | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [focusedId, setFocusedId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [recData, quotaData] = await Promise.all([
        recordingApi.listRecordings(1, 100),
        recordingApi.getQuota(),
      ])
      setRecordings(recData.items)
      setQuota(quotaData)
    } catch (error) {
      logger.error('Failed to load recordings', 'RecordingsScreenTV', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRecordings = useMemo(() => {
    if (activeFilter === 'manual') return recordings.filter(r => !r.series_rule_id && !r.epg_entry_id)
    if (activeFilter === 'scheduled') return recordings.filter(r => r.epg_entry_id && !r.series_rule_id)
    if (activeFilter === 'series') return recordings.filter(r => !!r.series_rule_id)
    return recordings
  }, [recordings, activeFilter])

  const handlePlay = useCallback((recording: Recording) => {
    navigation.navigate('WatchRecording', { recordingId: recording.id })
  }, [navigation])

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  }

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('recordings.filterAll') },
    { key: 'manual', label: t('recordings.filterManual') },
    { key: 'scheduled', label: t('recordings.filterScheduled') },
    { key: 'series', label: t('recordings.filterSeries') },
  ]

  const renderCard = ({ item }: { item: Recording }) => {
    const isFocused = focusedId === item.id
    return (
      <Pressable
        focusable
        onPress={() => handlePlay(item)}
        onFocus={() => setFocusedId(item.id)}
        onBlur={() => setFocusedId(null)}
        style={[
          styles.card,
          isFocused && styles.cardFocused,
        ]}
        hasTVPreferredFocus={false}
        accessibilityLabel={`${item.title}, ${formatDuration(item.duration_seconds)}`}
        accessibilityRole="button"
      >
        {/* Thumbnail */}
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

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.cardMeta}>
            <HardDrive size={12} color={colors.textMuted} />
            <Text style={styles.cardMetaText}>{formatBytes(item.file_size_bytes)}</Text>
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            {item.dubbed_audio_url && (
              <View style={styles.tvBadge}>
                <Volume2 size={16} color="#22c55e" />
              </View>
            )}
            {item.subtitle_url && (
              <View style={styles.tvBadge}>
                <Subtitles size={16} color={colors.primary} />
              </View>
            )}
            {item.series_rule_id && (
              <View style={styles.tvBadge}>
                <Repeat size={16} color="#a855f7" />
              </View>
            )}
          </View>
        </View>

        {/* Focus ring */}
        {isFocused && <View style={styles.focusRing} />}
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <TVHeader title={t('recordings.title')} />

      {/* Quota Summary */}
      {quota && (
        <View style={styles.quotaRow}>
          <HardDrive size={16} color={colors.textSecondary} />
          <Text style={styles.quotaText}>
            {quota.used_storage_formatted} / {quota.total_storage_formatted}
          </Text>
          <View style={styles.quotaBar}>
            <View style={[
              styles.quotaFill,
              {
                width: `${Math.min(quota.storage_usage_percentage, 100)}%`,
                backgroundColor: quota.storage_usage_percentage > 90 ? colors.error : colors.primary,
              }
            ]} />
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            focusable
            onPress={() => setActiveFilter(f.key)}
            style={[styles.filterButton, activeFilter === f.key && styles.filterButtonActive]}
            accessibilityLabel={f.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeFilter === f.key }}
          >
            <Text style={[
              styles.filterText,
              activeFilter === f.key && styles.filterTextActive,
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Grid */}
      {filteredRecordings.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Circle size={72} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>{t('recordings.noRecordings')}</Text>
          <Text style={styles.emptySubtitle}>{t('recordings.noRecordingsHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecordings}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          numColumns={TV_GRID_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  quotaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 60, paddingVertical: spacing.md },
  quotaText: { fontSize: fontSizeTV.sm, color: colors.textSecondary },
  quotaBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', maxWidth: 300 },
  quotaFill: { height: '100%', borderRadius: 2 },
  filterRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: 60, paddingBottom: spacing.lg },
  filterButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.06)' },
  filterButtonActive: { backgroundColor: 'rgba(168,85,247,0.25)' },
  filterText: { fontSize: fontSizeTV.base, color: colors.textSecondary },
  filterTextActive: { color: colors.text, fontWeight: '600' },
  gridContent: { paddingHorizontal: 60, paddingBottom: 60 },
  gridRow: { gap: spacing.lg, marginBottom: spacing.lg },
  card: { flex: 1, maxWidth: `${100 / TV_GRID_COLUMNS}%`, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', position: 'relative' },
  cardFocused: { transform: [{ scale: 1.05 }], shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, zIndex: 10 },
  thumbnailContainer: { width: '100%', height: 140, position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  durationOverlay: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  durationText: { color: '#fff', fontSize: fontSizeTV.xs, fontWeight: '600' },
  cardInfo: { padding: spacing.md },
  cardTitle: { fontSize: fontSizeTV.base, fontWeight: '600', color: colors.text, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardMetaText: { fontSize: fontSizeTV.xs, color: colors.textMuted },
  badgeRow: { flexDirection: 'row', gap: 4 },
  tvBadge: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 6, borderRadius: 6 },
  focusRing: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderWidth: 3, borderColor: '#a855f7', borderRadius: borderRadius.lg + 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  emptyTitle: { fontSize: fontSizeTV.xl, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: fontSizeTV.base, color: colors.textSecondary, textAlign: 'center', maxWidth: 400 },
})
