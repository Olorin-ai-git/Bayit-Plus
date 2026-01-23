/**
 * Scene Search Panel - In-player search overlay for finding scenes using natural language queries.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { FlatList, Platform, I18nManager, Animated, BackHandler, AccessibilityInfo } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView } from '@bayit/shared/ui'
import { isTV } from '@bayit/shared/utils/platform'
import { useSceneSearch, SceneSearchResult } from './hooks/useSceneSearch'
import SceneSearchResultCard from './SceneSearchResultCard'
import {
  SceneSearchHeader, SceneSearchInput, SceneSearchNavigation, SceneSearchEmptyState,
  sceneSearchStyles as styles, RESULT_CARD_HEIGHT, announceToScreenReader, handleFocusTrap,
} from './panel'

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
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const slideAnim = useRef(new Animated.Value(isTV ? 400 : 320)).current

  const {
    results, loading, error, currentIndex,
    search, goToNext, goToPrevious, goToResult, clearResults,
  } = useSceneSearch({ contentId, seriesId, language: i18n.language })

  // Check for reduced motion accessibility preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setPrefersReducedMotion)
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setPrefersReducedMotion)
    return () => sub.remove()
  }, [])

  // Slide animation (respects reduced motion preference)
  useEffect(() => {
    const target = isOpen ? 0 : (isTV ? 400 : 320)
    if (prefersReducedMotion) { slideAnim.setValue(target) }
    else { Animated.spring(slideAnim, { toValue: target, friction: 8, tension: 40, useNativeDriver: true }).start() }
  }, [isOpen, slideAnim, prefersReducedMotion])

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

  return (
    <Animated.View style={[styles.panelContainer, { transform: [{ translateX: slideAnim }] }]}>
      <GlassView
        style={styles.panel}
        intensity="high"
        testID="scene-search-panel"
        data-testid="scene-search-panel"
        accessibilityRole="dialog"
        accessibilityLabel={t('player.sceneSearch.title')}
      >
        <SceneSearchHeader resultCount={results.length} isRTL={isRTL} onClose={onClose} />
        <SceneSearchInput
          ref={inputRef}
          value={inputValue}
          isRTL={isRTL}
          onChangeText={setInputValue}
          onSubmit={handleSearch}
          onVoiceResult={handleVoiceResult}
        />
        <FlatList
          ref={scrollRef}
          data={results}
          renderItem={renderResultCard}
          keyExtractor={(item, index) => `${item.content_id}-${item.timestamp_seconds}-${index}`}
          getItemLayout={getItemLayout}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS !== 'web'}
          contentContainerStyle={styles.listContent}
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
      </GlassView>
    </Animated.View>
  )
}
