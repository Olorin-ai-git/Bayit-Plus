/**
 * Audiobooks Discovery Page
 * Main entry point for audiobook browsing and discovery
 */

import { useState, useEffect, useMemo } from 'react'
import { View, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useDirection } from '@/hooks/useDirection'
import { Search, X, RefreshCw } from 'lucide-react'
import audiobookService from '@/services/audiobookService'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import {
  GlassView,
  GlassInput,
  GlassPageHeader,
} from '@bayit/shared/ui'
import { LoadingState, EmptyState } from '@bayit/shared/components/states'
import logger from '@/utils/logger'
import PageLoading from '@/components/common/PageLoading'
import type { Audiobook, AudiobookFilters } from '@/types/audiobook'
import AudiobooksPageHeader from './AudiobooksPageHeader'
import AudiobooksPageFilters from './AudiobooksPageFilters'
import AudiobooksPageGrid from './AudiobooksPageGrid'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}33`,
  },
  searchContainer: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
  },
  refreshButton: {
    padding: spacing.md,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
})

export default function AudiobooksPage() {
  const { t } = useTranslation()
  const { isRTL } = useDirection()

  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<AudiobookFilters>({
    page: 1,
    page_size: 50,
  })

  // Filter audiobooks by search query
  const filteredAudiobooks = useMemo(() => {
    if (!searchQuery.trim()) return audiobooks

    const query = searchQuery.toLowerCase()
    return audiobooks.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query) ||
        book.narrator?.toLowerCase().includes(query)
    )
  }, [audiobooks, searchQuery])

  // Load audiobooks on mount and filter change
  useEffect(() => {
    loadAudiobooks()
  }, [filters])

  const loadAudiobooks = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await audiobookService.getAudiobooks(filters)
      setAudiobooks(response.items)
    } catch (err) {
      logger.error('Failed to load audiobooks', 'AudiobooksPage', err)
      setError(t('audiobooks.loadError', 'Failed to load audiobooks'))
      setAudiobooks([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setSyncing(true)
      audiobookService.clearCache()
      await loadAudiobooks()
    } catch (err) {
      logger.error('Failed to sync audiobooks', 'AudiobooksPage', err)
    } finally {
      setSyncing(false)
    }
  }

  if (loading && audiobooks.length === 0) {
    return (
      <PageLoading
        title={t('audiobooks.title', 'Audiobooks')}
        pageType="audiobooks"
        message={t('audiobooks.loading', 'Loading audiobooks...')}
        isRTL={isRTL}
      />
    )
  }

  return (
    <GlassView style={styles.container}>
      <ScrollView scrollEnabled={true} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <GlassPageHeader
            title={t('audiobooks.title', 'Audiobooks')}
            pageType="audiobooks"
            badge={audiobooks.length}
            isRTL={isRTL}
          />
          <Pressable
            onPress={handleRefresh}
            disabled={syncing}
            style={[styles.refreshButton, syncing && styles.refreshButtonDisabled]}
          >
            <RefreshCw size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Search */}
        <GlassInput
          placeholder={t('common.search', 'Search')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={18} color={colors.textMuted} />}
          rightIcon={
            searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textMuted} />
              </Pressable>
            ) : undefined
          }
          containerStyle={styles.searchContainer}
        />

        {/* Filters */}
        <AudiobooksPageFilters
          filters={filters}
          onChange={setFilters}
          isRTL={isRTL}
        />

        {/* Error State */}
        {error && (
          <EmptyState
            title={t('common.error', 'Error')}
            message={error}
            isRTL={isRTL}
          />
        )}

        {/* Grid */}
        {!error && (
          <AudiobooksPageGrid
            audiobooks={filteredAudiobooks}
            loading={loading}
            currentPage={filters.page || 1}
            onPageChange={(page) => setFilters({ ...filters, page })}
            searchQuery={searchQuery}
          />
        )}
      </ScrollView>
    </GlassView>
  )
}
