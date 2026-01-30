/**
 * RecordingsScreen (Mobile)
 * Display and manage user's recorded live streams on mobile
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Image, RefreshControl, ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { useDirection } from '@bayit/shared-hooks'
import {
  Circle, Trash2, Calendar, HardDrive,
  Play, Volume2, Repeat, Subtitles,
} from 'lucide-react-native'
import { GlassView } from '@bayit/shared'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { recordingApi, Recording, RecordingQuota } from '@bayit/shared-services/recordingApi'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { useSafeAreaPadding } from '../hooks/useSafeAreaPadding'
import logger from '@/utils/logger'

type FilterType = 'all' | 'manual' | 'scheduled' | 'series'

export const RecordingsScreen: React.FC = () => {
  const { t } = useTranslation()
  const { isRTL, flexDirection, textAlign } = useDirection()
  const navigation = useNavigation()
  const notifications = useNotifications()
  const safeArea = useSafeAreaPadding()

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [quota, setQuota] = useState<RecordingQuota | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    loadRecordings()
    loadQuota()
  }, [])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const data = await recordingApi.listRecordings(1, 50)
      setRecordings(data.items)
    } catch (error) {
      logger.error('Failed to load recordings', 'RecordingsScreen', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuota = async () => {
    try {
      const data = await recordingApi.getQuota()
      setQuota(data)
    } catch (error) {
      logger.error('Failed to load quota', 'RecordingsScreen', error)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadRecordings(), loadQuota()])
    setRefreshing(false)
  }, [])

  const filteredRecordings = useMemo(() => {
    if (activeFilter === 'manual') {
      return recordings.filter(r => !r.series_rule_id && !r.epg_entry_id)
    }
    if (activeFilter === 'scheduled') {
      return recordings.filter(r => r.epg_entry_id && !r.series_rule_id)
    }
    if (activeFilter === 'series') {
      return recordings.filter(r => !!r.series_rule_id)
    }
    return recordings
  }, [recordings, activeFilter])

  const handlePlay = useCallback((recording: Recording) => {
    // @ts-ignore navigation type
    navigation.navigate('WatchRecording', { recordingId: recording.id })
  }, [navigation])

  const handleDelete = useCallback(async (recordingId: string) => {
    try {
      await recordingApi.deleteRecording(recordingId)
      setRecordings(prev => prev.filter(r => r.id !== recordingId))
      await loadQuota()
      notifications.showSuccess(t('recordings.deleted'), t('recordings.title'))
    } catch (error) {
      logger.error('Failed to delete', 'RecordingsScreen', error)
      notifications.showError(t('recordings.deleteFailed'), t('recordings.error'))
    }
  }, [notifications, t])

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('recordings.filterAll') },
    { key: 'manual', label: t('recordings.filterManual') },
    { key: 'scheduled', label: t('recordings.filterScheduled') },
    { key: 'series', label: t('recordings.filterSeries') },
  ]

  const renderRecording = ({ item }: { item: Recording }) => (
    <Pressable onPress={() => handlePlay(item)} style={styles.card}>
      <GlassView style={styles.cardInner}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Play size={24} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(item.duration_seconds)}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={[styles.metaRow, { flexDirection }]}>
            <HardDrive size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatBytes(item.file_size_bytes)}</Text>
          </View>

          {/* Badges */}
          <View style={styles.badges}>
            {item.dubbed_audio_url && (
              <View style={styles.dubbedBadge}>
                <Volume2 size={10} color="#22c55e" />
                <Text style={styles.dubbedBadgeText}>
                  {item.dubbed_audio_language?.toUpperCase()}
                </Text>
              </View>
            )}
            {item.subtitle_url && (
              <View style={styles.subtitleBadgeMobile}>
                <Subtitles size={10} color={colors.primary} />
              </View>
            )}
            {item.series_rule_id && (
              <View style={styles.seriesBadgeMobile}>
                <Repeat size={10} color="#a855f7" />
              </View>
            )}
          </View>
        </View>
      </GlassView>
    </Pressable>
  )

  return (
    <View style={[styles.container, { paddingTop: safeArea.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign }]}>
          {t('recordings.title')}
        </Text>
      </View>

      {/* Quota */}
      {quota && (
        <GlassView style={styles.quotaBar}>
          <View style={[styles.quotaRow, { flexDirection }]}>
            <Text style={styles.quotaLabel}>{t('recordings.storageUsed')}</Text>
            <Text style={styles.quotaValue}>
              {quota.used_storage_formatted} / {quota.total_storage_formatted}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={[
              styles.progressFill,
              {
                width: `${Math.min(quota.storage_usage_percentage, 100)}%`,
                backgroundColor: quota.storage_usage_percentage > 90 ? colors.error : colors.primary,
              }
            ]} />
          </View>
        </GlassView>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map(f => (
          <Pressable
            key={f.key}
            style={[styles.filterPill, activeFilter === f.key && styles.filterPillActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[
              styles.filterPillText,
              activeFilter === f.key && styles.filterPillTextActive,
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filteredRecordings}
        keyExtractor={item => item.id}
        renderItem={renderRecording}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Circle size={56} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>{t('recordings.noRecordings')}</Text>
              <Text style={styles.emptySubtitle}>{t('recordings.noRecordingsHint')}</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  quotaBar: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.md },
  quotaRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  quotaLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  quotaValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  progressContainer: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md, flexDirection: 'row' },
  filterPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.06)' },
  filterPillActive: { backgroundColor: 'rgba(168,85,247,0.2)' },
  filterPillText: { fontSize: fontSize.sm, color: colors.textSecondary },
  filterPillTextActive: { color: colors.text, fontWeight: '600' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: { marginBottom: spacing.md },
  cardInner: { borderRadius: borderRadius.lg, overflow: 'hidden', flexDirection: 'row' },
  thumbnailContainer: { width: 140, height: 90, position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  durationBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  durationText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardContent: { flex: 1, padding: spacing.sm, justifyContent: 'center' },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: 4 },
  metaRow: { alignItems: 'center', gap: 4, marginBottom: 4 },
  metaText: { fontSize: 11, color: colors.textMuted },
  badges: { flexDirection: 'row', gap: 4 },
  dubbedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dubbedBadgeText: { fontSize: 9, color: '#22c55e', fontWeight: '600' },
  subtitleBadgeMobile: { backgroundColor: `${colors.primary}20`, padding: 4, borderRadius: 4 },
  seriesBadgeMobile: { backgroundColor: 'rgba(168,85,247,0.15)', padding: 4, borderRadius: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 },
})
