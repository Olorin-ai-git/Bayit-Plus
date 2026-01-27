/**
 * Audiobooks Screen (Mobile)
 * Mobile-optimized audiobooks discovery with responsive grid
 */

import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useDirection } from '@bayit/shared-hooks'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import logger from '@/utils/logger'
import type { Audiobook, AudiobookFilters } from '@/types/audiobook'
import audiobookService from '@/services/audiobookService'
import { useResponsive } from '../hooks/useResponsive'
import { useSafeAreaPadding } from '../hooks/useSafeAreaPadding'
import AudiobookCardMobile from '../components/AudiobookCardMobile'
import AudiobookFiltersMobile from '../components/AudiobookFiltersMobile'

export default function AudiobooksScreenMobile({ navigation }: any) {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const { width } = useResponsive()
  const safeAreaPadding = useSafeAreaPadding()

  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [filteredAudiobooks, setFilteredAudiobooks] = useState<Audiobook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<AudiobookFilters>({ page: 1, page_size: 20 })
  const [showFilters, setShowFilters] = useState(false)

  const loadAudiobooks = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const response = await audiobookService.getAudiobooks(filters)
      setAudiobooks(response.items || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.loadError', 'Failed to load audiobooks')
      logger.error(msg, 'AudiobooksScreenMobile', err); setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [filters, t])

  useEffect(() => { loadAudiobooks() }, [loadAudiobooks])

  useEffect(() => {
    const filtered = audiobooks.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.author?.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredAudiobooks(filtered)
  }, [searchQuery, audiobooks])

  const handleRefresh = async () => {
    setRefreshing(true); await audiobookService.clearCache(); await loadAudiobooks(); setRefreshing(false)
  }

  const handleEndReached = () => {
    setPage(p => p + 1); setFilters(f => ({ ...f, page: page + 1 }))
  }

  const numColumns = width > 600 ? 3 : 2
  const cardWidth = (width - (spacing.lg * 2)) / numColumns - spacing.md

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>{error ? t('common.error', 'Error') : t('common.noData', 'No audiobooks found')}</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {error && <GlassButton variant="primary" onPress={handleRefresh}>{t('common.retry', 'Retry')}</GlassButton>}
    </View>
  )

  return (
    <GlassView style={[styles.container, { paddingTop: safeAreaPadding.top, paddingBottom: safeAreaPadding.bottom }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text style={styles.title}>{t('audiobooks.title', 'Audiobooks')}</Text>
        <GlassButton variant="secondary" size="sm" onPress={() => setShowFilters(!showFilters)}>{t('common.filter', 'Filter')}</GlassButton>
      </View>

      {showFilters && <AudiobookFiltersMobile filters={filters} onChange={setFilters} isRTL={isRTL} />}

      <FlatList
        data={filteredAudiobooks}
        renderItem={({ item }) => <AudiobookCardMobile audiobook={item} cardWidth={cardWidth} navigation={navigation} />}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: spacing.lg }]}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.DEFAULT} />}
        scrollIndicatorInsets={{ right: 1 }}
      />

      {isLoading && filteredAudiobooks.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      )}
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  columnWrapper: { gap: spacing.md, justifyContent: 'space-between' },
  listContent: { paddingVertical: spacing.md, gap: spacing.sm },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md, textAlign: 'center' },
  errorText: { fontSize: 14, color: '#ef4444', marginBottom: spacing.lg, textAlign: 'center' },
  loadingContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
})
