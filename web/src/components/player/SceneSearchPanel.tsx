/**
 * Scene Search Panel - In-player search overlay for finding scenes using natural language queries.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { View, FlatList, Platform, I18nManager, BackHandler, AccessibilityInfo, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { isTV } from '@bayit/shared/utils/platform'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useSceneSearch, SceneSearchResult } from './hooks/useSceneSearch'
import SceneSearchResultCard from './SceneSearchResultCard'
import {
  SceneSearchHeader, SceneSearchInput, SceneSearchNavigation, SceneSearchEmptyState,
  RESULT_CARD_HEIGHT,
} from './panel'
import { PLATFORM_CONFIG } from './panel/platformConfig'
import {
  announceToScreenReader,
  handleFocusTrap,
  useLiveRegion,
  useFocusManagement,
  getSearchStatusARIA,
  ARIA_ROLES,
} from './panel/accessibilityEnhancements'

interface SceneSearchPanelProps {
  contentId?: string
  seriesId?: string
  isOpen?: boolean
  onClose?: () => void
  onSeek?: (time: number) => void
}

export default function SceneSearchPanel({
  contentId, seriesId, isOpen = false, onClose, onSeek,
}: SceneSearchPanelProps) {
  const { t, i18n } = useTranslation()
  const isRTL = I18nManager.isRTL || i18n.language === 'he' || i18n.language === 'ar'
  const inputRef = useRef<any>(null)
  const scrollRef = useRef<FlatList>(null)
  const panelRef = useRef<any>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [inputValue, setInputValue] = useState('')

  const {
    results, loading, error, currentIndex,
    search, goToNext, goToPrevious, goToResult, clearResults,
  } = useSceneSearch({ contentId, seriesId, language: i18n.language })

  // WCAG 2.1 Accessibility: Live region for search status
  const searchStatusMessage = loading
    ? t('player.sceneSearch.searching')
    : error
    ? t('player.sceneSearch.error')
    : results.length > 0
    ? t('player.sceneSearch.results.found', { count: results.length })
    : inputValue.length >= 2
    ? t('player.sceneSearch.noResults')
    : ''

  useLiveRegion({
    enabled: isOpen,
    message: searchStatusMessage,
    assertive: !!error,
  })

  // WCAG 2.1 Accessibility: Focus management
  useFocusManagement({
    isOpen,
    panelRef,
    returnFocusRef: previousFocusRef,
  })

  // Focus management
  useEffect(() => {
    if (isOpen) {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        previousFocusRef.current = document.activeElement as HTMLElement
      }
      setTimeout(() => inputRef.current?.focus(), 300)
      announceToScreenReader(t('player.sceneSearch.panelOpened'))
    } else {
      if (Platform.OS === 'web' && previousFocusRef.current?.focus) previousFocusRef.current.focus()
      setInputValue('')
      clearResults()
    }
  }, [isOpen, clearResults, t])

  // Keyboard navigation with focus trap
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); goToNext() }
      else if (e.key === 'ArrowUp') { e.preventDefault(); goToPrevious() }
      else if (e.key === 'Enter' && results[currentIndex]) {
        e.preventDefault(); handleSeekToResult(results[currentIndex])
      } else if (e.key === 'Tab') handleFocusTrap(e)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, goToNext, goToPrevious, results, currentIndex])

  // tvOS/Android TV Menu button support
  useEffect(() => {
    if (!isTV || !isOpen) return
    const handleBack = () => { onClose?.(); return true }
    BackHandler.addEventListener('hardwareBackPress', handleBack)
    return () => BackHandler.removeEventListener('hardwareBackPress', handleBack)
  }, [isOpen, onClose])

  // Scroll to current result
  useEffect(() => {
    if (scrollRef.current && currentIndex >= 0 && results.length > 0) {
      scrollRef.current.scrollToIndex({ index: currentIndex, animated: true, viewPosition: 0.3 })
    }
  }, [currentIndex, results.length])

  const handleSearch = useCallback(() => {
    if (inputValue.trim().length >= 2) {
      search(inputValue)
      announceToScreenReader(t('player.sceneSearch.searching'))
    }
  }, [inputValue, search, t])

  const handleVoiceResult = useCallback((transcript: string) => {
    setInputValue(transcript)
    search(transcript)
    announceToScreenReader(t('player.sceneSearch.voiceReceived', { query: transcript }))
  }, [search, t])

  const handleSeekToResult = useCallback((result: SceneSearchResult) => {
    if (result.timestamp_seconds != null) {
      onSeek?.(result.timestamp_seconds)
      announceToScreenReader(t('player.sceneSearch.seekingTo', { time: result.timestamp_formatted }))
    }
  }, [onSeek, t])

  const handleResultClick = useCallback((result: SceneSearchResult, index: number) => {
    goToResult(index)
    handleSeekToResult(result)
  }, [goToResult, handleSeekToResult])

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

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: RESULT_CARD_HEIGHT, offset: RESULT_CARD_HEIGHT * index, index,
  }), [])

  if (!isOpen) return null

  const handleBackdropClick = (e: any) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    onClose?.()
  }

  const stopPropagation = (e: any) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
  }

  return (
    <>
      {/* Backdrop to close panel when clicking outside */}
      <View
        style={styles.backdrop}
        onClick={handleBackdropClick}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
      />

      {/* Panel */}
      <View
        ref={panelRef}
        style={styles.panel}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
        testID="scene-search-panel"
        data-testid="scene-search-panel"
        accessibilityRole={ARIA_ROLES.panel as any}
        accessibilityLabel={t('player.sceneSearch.title')}
        {...getSearchStatusARIA(loading, error, results.length)}
      >
        <SceneSearchHeader resultCount={results.length} isRTL={isRTL} onClose={onClose} />
        <SceneSearchInput
          ref={inputRef}
          value={inputValue}
          isRTL={isRTL}
          onChangeText={setInputValue}
          onSubmit={handleSearch}
          onVoiceResult={handleVoiceResult}
          isOpen={isOpen}
        />
        <FlatList
          ref={scrollRef}
          data={results}
          renderItem={renderResultCard}
          keyExtractor={(item, index) => `${item.content_id}-${item.timestamp_seconds}-${index}`}
          getItemLayout={getItemLayout}
          windowSize={PLATFORM_CONFIG.list.windowSize}
          maxToRenderPerBatch={PLATFORM_CONFIG.list.maxToRenderPerBatch}
          initialNumToRender={PLATFORM_CONFIG.list.initialNumToRender}
          removeClippedSubviews={PLATFORM_CONFIG.list.removeClippedSubviews}
          contentContainerStyle={styles.listContent}
          accessibilityRole={ARIA_ROLES.resultsList as any}
          accessibilityLabel={t('player.sceneSearch.results.label', {
            count: results.length,
            current: currentIndex + 1,
          })}
          ListEmptyComponent={
            <SceneSearchEmptyState loading={loading} error={error} hasQuery={inputValue.length >= 2} />
          }
        />
        {results.length > 0 && (
          <SceneSearchNavigation
            currentIndex={currentIndex}
            totalResults={results.length}
            isRTL={isRTL}
            onPrevious={goToPrevious}
            onNext={goToNext}
          />
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 89,
    // @ts-ignore - Web-specific CSS
    pointerEvents: 'auto',
    cursor: 'default',
  },
  panel: {
    position: 'absolute',
    bottom: 80,
    right: spacing.md,
    width: 360,
    maxHeight: 500,
    borderRadius: borderRadius.xl,
    zIndex: 90,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    // @ts-ignore - Web-specific CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    pointerEvents: 'auto',
  },
  listContent: {
    padding: spacing.md,
  },
});
