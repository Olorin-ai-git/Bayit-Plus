/**
 * Scene Search Panel Component
 *
 * In-player search overlay for finding specific scenes within
 * videos or series using natural language queries.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  I18nManager,
  AccessibilityInfo,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, X, ChevronLeft, ChevronRight, Mic } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView, GlassInput } from '@bayit/shared/ui'
import { VoiceSearchButton } from '@bayit/shared/components/VoiceSearchButton'
import { useSceneSearch, SceneSearchResult } from './hooks/useSceneSearch'
import SceneSearchResultCard from './SceneSearchResultCard'

const RESULT_CARD_HEIGHT = 88

interface SceneSearchPanelProps {
  contentId?: string
  seriesId?: string
  isOpen?: boolean
  onClose?: () => void
  onSeek?: (time: number) => void
}

export default function SceneSearchPanel({
  contentId,
  seriesId,
  isOpen = false,
  onClose,
  onSeek,
}: SceneSearchPanelProps) {
  const { t, i18n } = useTranslation()
  const isRTL = I18nManager.isRTL || i18n.language === 'he' || i18n.language === 'ar'
  const inputRef = useRef<any>(null)
  const scrollRef = useRef<FlatList>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [inputValue, setInputValue] = useState('')

  const {
    results,
    loading,
    error,
    currentIndex,
    search,
    goToNext,
    goToPrevious,
    goToResult,
    clearResults,
  } = useSceneSearch({ contentId, seriesId, language: i18n.language })

  // Focus management - save previous focus and restore on close
  useEffect(() => {
    if (isOpen) {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        previousFocusRef.current = document.activeElement as HTMLElement
      }
      // Focus input after panel animation
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      // Restore focus on close
      if (Platform.OS === 'web' && previousFocusRef.current?.focus) {
        previousFocusRef.current.focus()
      }
      // Clear results when closing
      setInputValue('')
      clearResults()
    }
  }, [isOpen, clearResults])

  // Keyboard navigation
  useEffect(() => {
    if (Platform.OS !== 'web') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        goToNext()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === 'Enter' && results[currentIndex]) {
        e.preventDefault()
        const result = results[currentIndex]
        if (result.timestamp_seconds != null) {
          onSeek?.(result.timestamp_seconds)
          announceToScreenReader(
            t('player.sceneSearch.seekingTo', { time: result.timestamp_formatted })
          )
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, goToNext, goToPrevious, results, currentIndex, onSeek, t])

  // Scroll to current result
  useEffect(() => {
    if (scrollRef.current && currentIndex >= 0 && results.length > 0) {
      scrollRef.current.scrollToIndex({
        index: currentIndex,
        animated: true,
        viewPosition: 0.3,
      })
    }
  }, [currentIndex, results.length])

  const handleSearch = useCallback(() => {
    if (inputValue.trim().length >= 2) {
      search(inputValue)
      announceToScreenReader(t('player.sceneSearch.searching'))
    }
  }, [inputValue, search, t])

  const handleVoiceResult = useCallback(
    (transcript: string) => {
      setInputValue(transcript)
      search(transcript)
      announceToScreenReader(t('player.sceneSearch.voiceReceived', { query: transcript }))
    },
    [search, t]
  )

  const handleResultClick = useCallback(
    (result: SceneSearchResult, index: number) => {
      goToResult(index)
      if (result.timestamp_seconds != null) {
        onSeek?.(result.timestamp_seconds)
        announceToScreenReader(
          t('player.sceneSearch.seekingTo', { time: result.timestamp_formatted })
        )
      }
    },
    [goToResult, onSeek, t]
  )

  const renderResultCard = useCallback(
    ({ item, index }: { item: SceneSearchResult; index: number }) => (
      <SceneSearchResultCard
        result={item}
        isActive={index === currentIndex}
        onPress={() => handleResultClick(item, index)}
      />
    ),
    [currentIndex, handleResultClick]
  )

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: RESULT_CARD_HEIGHT,
      offset: RESULT_CARD_HEIGHT * index,
      index,
    }),
    []
  )

  if (!isOpen) return null

  return (
    <GlassView
      style={[styles.panel, isOpen ? styles.panelOpen : styles.panelClosed]}
      intensity="high"
    >
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
          <Search size={18} color={colors.primary} />
          <Text style={styles.title}>{t('player.sceneSearch.title')}</Text>
          {results.length > 0 && (
            <Text style={styles.resultCount}>({results.length})</Text>
          )}
        </View>
        <Pressable
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={[styles.searchRow, isRTL && styles.searchRowRTL]}>
        <GlassInput
          ref={inputRef}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={t('player.sceneSearch.placeholder')}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel={t('player.sceneSearch.inputLabel')}
        />
        <VoiceSearchButton onResult={handleVoiceResult} />
      </View>

      {/* Results List */}
      <FlatList
        ref={scrollRef}
        data={results}
        renderItem={renderResultCard}
        keyExtractor={(item, index) =>
          `${item.content_id}-${item.timestamp_seconds}-${index}`
        }
        getItemLayout={getItemLayout}
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        removeClippedSubviews={Platform.OS !== 'web'}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.emptyText}>{t('player.sceneSearch.searching')}</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : inputValue.length >= 2 ? (
            <View style={styles.emptyState}>
              <Search size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('player.sceneSearch.noResults')}</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Search size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('player.sceneSearch.hint')}</Text>
            </View>
          )
        }
      />

      {/* Navigation Footer */}
      {results.length > 0 && (
        <View style={[styles.navRow, isRTL && styles.navRowRTL]} testID="nav-row">
          <Pressable
            onPress={goToPrevious}
            disabled={currentIndex === 0}
            style={[
              styles.navButton,
              currentIndex === 0 && styles.navButtonDisabled,
              isRTL && styles.navButtonRTL,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('player.sceneSearch.previous')}
          >
            {isRTL ? (
              <>
                <Text style={styles.navText}>{t('player.sceneSearch.previous')}</Text>
                <ChevronRight size={20} color={colors.text} />
              </>
            ) : (
              <>
                <ChevronLeft size={20} color={colors.text} />
                <Text style={styles.navText}>{t('player.sceneSearch.previous')}</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.navCounter}>
            {currentIndex + 1} / {results.length}
          </Text>

          <Pressable
            onPress={goToNext}
            disabled={currentIndex === results.length - 1}
            style={[
              styles.navButton,
              currentIndex === results.length - 1 && styles.navButtonDisabled,
              isRTL && styles.navButtonRTL,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('player.sceneSearch.next')}
          >
            {isRTL ? (
              <>
                <ChevronLeft size={20} color={colors.text} />
                <Text style={styles.navText}>{t('player.sceneSearch.next')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.navText}>{t('player.sceneSearch.next')}</Text>
                <ChevronRight size={20} color={colors.text} />
              </>
            )}
          </Pressable>
        </View>
      )}
    </GlassView>
  )
}

// Screen reader announcement helper
function announceToScreenReader(message: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    el.setAttribute('aria-atomic', 'true')
    el.style.position = 'absolute'
    el.style.left = '-10000px'
    el.style.width = '1px'
    el.style.height = '1px'
    el.style.overflow = 'hidden'
    el.textContent = message
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1000)
  } else {
    AccessibilityInfo.announceForAccessibility(message)
  }
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    width: 320,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    zIndex: 40,
  },
  panelOpen: {
    transform: [{ translateX: 0 }],
  },
  panelClosed: {
    transform: [{ translateX: 320 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resultCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchRowRTL: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
  },
  listContent: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navRowRTL: {
    flexDirection: 'row-reverse',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
  },
  navButtonRTL: {
    flexDirection: 'row-reverse',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navText: {
    fontSize: 14,
    color: '#fff',
  },
  navCounter: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontVariant: ['tabular-nums'],
  },
})
