/** RecordingsScreenTV - tvOS recordings with 4-column focus-navigable grid */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Circle, HardDrive } from 'lucide-react-native'
import { TVHeader } from '../components/TVHeader'
import { RecordingCard } from '../components/recordings/RecordingCard'
import { colors } from '@olorin/design-tokens'
import { styles } from './styles/RecordingsScreenTV.styles'
import { recordingApi, Recording, RecordingQuota } from '@bayit/shared-services/recordingApi'
import logger from '@/utils/logger'

const TV_GRID_COLUMNS = 4
type FilterType = 'all' | 'manual' | 'scheduled' | 'series'

export const RecordingsScreenTV: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [quota, setQuota] = useState<RecordingQuota | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [focusedId, setFocusedId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

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

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('recordings.filterAll') }, { key: 'manual', label: t('recordings.filterManual') },
    { key: 'scheduled', label: t('recordings.filterScheduled') }, { key: 'series', label: t('recordings.filterSeries') },
  ]

  const renderCard = ({ item }: { item: Recording }) => (
    <RecordingCard
      item={item}
      isFocused={focusedId === item.id}
      onPress={() => handlePlay(item)}
      onFocus={() => setFocusedId(item.id)}
      onBlur={() => setFocusedId(null)}
    />
  )

  return (
    <View style={styles.container}>
      <TVHeader title={t('recordings.title')} />

      {quota && (
        <View style={styles.quotaRow}>
          <HardDrive size={16} color={colors.textSecondary} />
          <Text style={styles.quotaText}>
            {quota.used_storage_formatted} / {quota.total_storage_formatted}
          </Text>
          <View style={styles.quotaBar}>
            <View style={[styles.quotaFill, {
              width: `${Math.min(quota.storage_usage_percentage, 100)}%`,
              backgroundColor: quota.storage_usage_percentage > 90 ? colors.error : colors.primary,
            }]} />
          </View>
        </View>
      )}

      <View style={styles.filterRow}>
        {filters.map(f => (
          <Pressable
            key={f.key} focusable
            onPress={() => setActiveFilter(f.key)}
            style={[styles.filterButton, activeFilter === f.key && styles.filterButtonActive]}
            accessibilityLabel={f.label} accessibilityRole="tab"
            accessibilityState={{ selected: activeFilter === f.key }}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

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
