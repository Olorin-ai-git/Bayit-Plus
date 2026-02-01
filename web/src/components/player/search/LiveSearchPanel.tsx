/**
 * LiveSearchPanel Component
 * Panel for searching live transcripts with real-time results
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, TextInput, FlatList, Platform, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, X, FileText } from 'lucide-react-native'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { searchTranscripts, type TranscriptMatch } from '@/services/liveSearchApi'
import { SearchResultCard } from './SearchResultCard'
import { searchStyles as styles, getTvStyles, ICON_COLORS } from './searchStyles'
import logger from '@bayit/shared-utils/logger'

const LOG_CONTEXT = 'LiveSearchPanel'
const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

interface LiveSearchPanelProps {
  channelId: string
  onClose?: () => void
  onTimestampSelect?: (timestamp: string) => void
  isRTL?: boolean
}

export function LiveSearchPanel({
  channelId,
  onClose,
  onTimestampSelect,
  isRTL = false,
}: LiveSearchPanelProps) {
  const { t, i18n } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TranscriptMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const isHebrew = i18n.language === 'he' || isRTL

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < MIN_QUERY_LENGTH) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const response = await searchTranscripts(channelId, searchQuery)
      setResults(response.results)
    } catch (err) {
      logger.error('Search failed', LOG_CONTEXT, { channelId, query: searchQuery, error: err })
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [channelId])

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      performSearch(text)
    }, DEBOUNCE_MS)
  }, [performSearch])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setSearched(false)
  }, [])

  const renderResult = useCallback(({ item }: { item: TranscriptMatch }) => (
    <SearchResultCard
      result={item}
      query={query}
      onPress={onTimestampSelect}
      isRTL={isHebrew}
    />
  ), [query, onTimestampSelect, isHebrew])

  const renderEmpty = () => {
    if (!searched) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={isTV ? 48 : 32} color={ICON_COLORS.muted} />
          <Text style={styles.emptyText}>
            {t('liveSearch.enterQuery')}
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.emptyContainer}>
        <FileText size={isTV ? 48 : 32} color={ICON_COLORS.muted} />
        <Text style={styles.emptyText}>
          {t('liveSearch.noResults')}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.panelContainer}>
      {/* Header */}
      <View style={[styles.panelHeader, isHebrew && styles.panelHeaderRTL]}>
        <Text style={[styles.panelTitle, tvStyles.headerText]}>
          {t('liveSearch.liveTitle')}
        </Text>
        {onClose && (
          <GlassButton
            icon={<X size={isTV ? 24 : 16} color={ICON_COLORS.secondary} />}
            onPress={onClose}
            variant="ghost"
            size={isTV ? 'md' : 'sm'}
            accessibilityLabel={t('common.close')}
          />
        )}
      </View>

      {/* Search Input */}
      <View
        style={[
          styles.searchInputContainer,
          inputFocused && styles.searchInputContainerFocused,
          isHebrew && styles.searchInputContainerRTL,
        ]}
      >
        <Search size={isTV ? 20 : 16} color={ICON_COLORS.secondary} />
        <TextInput
          style={[
            styles.searchInput,
            tvStyles.inputText,
            isHebrew && styles.searchInputRTL,
          ]}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={t('liveSearch.placeholder')}
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <GlassButton
            icon={<X size={isTV ? 18 : 14} color={ICON_COLORS.secondary} />}
            onPress={handleClear}
            variant="ghost"
            size="sm"
            style={styles.clearButton}
            accessibilityLabel={t('common.clear')}
          />
        )}
      </View>

      {/* Stats Bar */}
      {searched && !loading && (
        <View style={[styles.statsBar, isHebrew && styles.statsBarRTL]}>
          <Text style={styles.statsText}>
            {t('liveSearch.resultsCount', { count: results.length })}
          </Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={isTV ? 'large' : 'small'} color={ICON_COLORS.primary} />
        </View>
      )}

      {/* Results List */}
      {!loading && (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
          renderItem={renderResult}
          ListEmptyComponent={renderEmpty}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

export default LiveSearchPanel
