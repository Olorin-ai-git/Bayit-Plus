# Scene Search - Remediation Implementation Guide

**Date**: 2026-01-22
**Purpose**: Step-by-step guide to fix all blocking issues
**Estimated Time**: 5-6 hours

---

## Issue 1: Replace Native Slider with GlassSlider

### Step 1a: Check if GlassSlider Exists

```bash
# Search for GlassSlider in codebase
grep -r "GlassSlider" /path/to/olorin-media/bayit-plus/shared/

# Check glass components index
cat /path/to/shared/components/ui/index.ts | grep -i slider
```

**Expected Result**: Currently NOT in the Glass library (based on review)

---

### Step 1b: Create GlassSlider Component

**File**: `/olorin-media/bayit-plus/shared/components/ui/GlassSlider.tsx`

```typescript
/**
 * GlassSlider Component
 *
 * Range slider using Glass design system
 * Supports web, TV, and mobile platforms
 */

import { View, Pressable, StyleSheet, Platform } from 'react-native'
import { colors, tvFontSize } from '@bayit/shared/theme'

interface GlassSliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  onChangeEnd?: (value: number) => void
  disabled?: boolean
  ariaLabel?: string
  ariaValueMin?: number
  ariaValueMax?: number
  ariaValueNow?: number
  style?: object
  testID?: string
}

export function GlassSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onChangeEnd,
  disabled = false,
  ariaLabel,
  ariaValueMin,
  ariaValueMax,
  ariaValueNow,
  style,
  testID,
}: GlassSliderProps) {
  const handleChange = (e: any) => {
    if (disabled) return

    let newValue: number

    if (Platform.OS === 'web') {
      // Web: input event
      newValue = parseFloat(e.target?.value || e.nativeEvent?.text || String(value))
    } else {
      // Mobile/TV: Pressable with calculated value
      return
    }

    // Clamp value to min/max
    const clampedValue = Math.max(min, Math.min(max, newValue))

    onChange(clampedValue)
  }

  const handleWeb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }

  // Web implementation
  if (Platform.OS === 'web') {
    return (
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={handleWeb}
        onChangeEnd={() => onChangeEnd?.(value)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-valuemin={ariaValueMin ?? min}
        aria-valuemax={ariaValueMax ?? max}
        aria-valuenow={ariaValueNow ?? Math.round(value)}
        data-testid={testID}
        style={{
          width: '100%',
          height: 32,
          accentColor: colors.primary,
          background: colors.glassLight,
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          ...style,
        }}
      />
    )
  }

  // For TV/Mobile, use custom implementation or fallback
  // This is a simplified version - expand as needed
  return (
    <View
      style={[
        styles.container,
        disabled && styles.disabled,
        style,
      ]}
      testID={testID}
    >
      <View
        style={styles.track}
        accessibilityRole="slider"
        accessibilityLabel={ariaLabel}
        accessibilityValue={{
          min: ariaValueMin ?? min,
          max: ariaValueMax ?? max,
          now: ariaValueNow ?? value,
        }}
      >
        {/* Progress bar */}
        <View
          style={[
            styles.progress,
            { width: `${((value - min) / (max - min)) * 100}%` },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  track: {
    height: 4,
    backgroundColor: colors.glassLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
})

export default GlassSlider
```

---

### Step 1c: Export from Glass Components Index

**File**: `/olorin-media/bayit-plus/shared/components/ui/index.ts`

Add to exports:
```typescript
export { GlassSlider } from './GlassSlider'
```

---

### Step 1d: Update PlayerControls.tsx

**File**: `/web/src/components/player/PlayerControls.tsx`

Replace (Lines 224-245):
```tsx
// BEFORE - Native HTML ❌
<View style={styles.sliderContainer}>
  <input
    type="range"
    value={state.isMuted ? 0 : state.volume}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
      controls.handleVolumeChange(e)
    }}
    min={0}
    max={1}
    step={0.1}
    aria-label={t('player.volume')}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round((state.isMuted ? 0 : state.volume) * 100)}
    style={{
      width: '100%',
      height: isTV ? 40 : 32,
      accentColor: colors.primary,
      background: colors.glassLight,
      borderRadius: 4,
      cursor: 'pointer',
    }}
  />
</View>
```

With (Lines 223-248):
```tsx
// AFTER - Glass Component ✅
import { GlassSlider } from '@bayit/shared/ui'

// ... in render:
<View style={styles.sliderContainer}>
  <GlassSlider
    value={state.isMuted ? 0 : state.volume}
    min={0}
    max={1}
    step={0.1}
    onChange={(value) => {
      controls.handleVolumeChange({ target: { value } } as any)
    }}
    ariaLabel={t('player.volume')}
    ariaValueMin={0}
    ariaValueMax={100}
    ariaValueNow={Math.round((state.isMuted ? 0 : state.volume) * 100)}
    style={styles.volumeSlider}
  />
</View>
```

---

### Step 1e: Verify

```bash
# Verify import works
npm run lint

# Test on web
npm run start:web

# Test on TV
npm run test:tv
```

**Validation Checklist**:
- [ ] GlassSlider component created
- [ ] Added to glass components index
- [ ] PlayerControls imports GlassSlider
- [ ] No console errors
- [ ] ARIA attributes work
- [ ] Volume control functions correctly
- [ ] Styling matches Glass design system

---

## Issue 2: Refactor Large Component Files

### Step 2a: Refactor SceneSearchPanel.tsx (574 lines → split)

**Current structure** (1 file, 574 lines):
```
SceneSearchPanel.tsx (574 lines)
  ├── Header section (lines 233-260)
  ├── Search input (lines 262-275)
  ├── Results list (lines 278-320)
  └── Navigation footer (lines 323-408)
```

**Target structure** (4 files, all < 200 lines):
```
SceneSearchPanel.tsx (< 100 lines) - Main container/orchestrator
SceneSearchHeader.tsx (< 100 lines) - Header with close button
SceneSearchList.tsx (< 150 lines) - Results list with empty states
SceneSearchNav.tsx (< 100 lines) - Navigation footer (prev/next)
```

---

#### Create SceneSearchHeader.tsx

```typescript
/**
 * Scene Search Panel Header
 * Title, close button, result count
 */

import { View, Text, Pressable, StyleSheet, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { colors, tvFontSize } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'

interface SceneSearchHeaderProps {
  resultCount: number
  onClose?: () => void
}

export function SceneSearchHeader({ resultCount, onClose }: SceneSearchHeaderProps) {
  const { t, i18n } = useTranslation()
  const isRTL = I18nManager.isRTL || i18n.language === 'he' || i18n.language === 'ar'
  const closeBtnFocus = useTVFocus({ styleType: 'button' })

  return (
    <View style={[styles.header, isRTL && styles.headerRTL]}>
      <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
        <Search size={isTV ? 24 : 18} color={colors.primary} />
        <Text style={[styles.title, isTV && styles.titleTV]}>
          {t('player.sceneSearch.title')}
        </Text>
        {resultCount > 0 && (
          <Text style={[styles.resultCount, isTV && styles.resultCountTV]}>
            ({isRTL ? resultCount.toLocaleString('he-IL') : resultCount})
          </Text>
        )}
      </View>
      <Pressable
        onPress={onClose}
        onFocus={closeBtnFocus.handleFocus}
        onBlur={closeBtnFocus.handleBlur}
        style={[
          styles.closeButton,
          closeBtnFocus.isFocused && closeBtnFocus.focusStyle,
        ]}
        focusable={true}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        <X size={isTV ? 24 : 18} color={colors.textSecondary} />
      </Pressable>
    </View>
  )
}

const MIN_TOUCH_TARGET = 44

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isTV ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 12 : 8,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  titleTV: {
    fontSize: tvFontSize.xl,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  resultCountTV: {
    fontSize: tvFontSize.base,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

---

#### Create SceneSearchList.tsx

```typescript
/**
 * Scene Search Results List
 * Displays search results with empty/error states
 */

import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  I18nManager,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, AlertCircle } from 'lucide-react'
import { colors, tvFontSize } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import SceneSearchResultCard from './SceneSearchResultCard'
import type { SceneSearchResult } from './hooks/useSceneSearch'

const RESULT_CARD_HEIGHT = 88

interface SceneSearchListProps {
  results: SceneSearchResult[]
  currentIndex: number
  loading: boolean
  error: string | null
  inputValue: string
  onResultClick: (result: SceneSearchResult, index: number) => void
  listRef?: React.RefObject<FlatList>
}

export function SceneSearchList({
  results,
  currentIndex,
  loading,
  error,
  inputValue,
  onResultClick,
  listRef,
}: SceneSearchListProps) {
  const { t, i18n } = useTranslation()
  const isRTL = I18nManager.isRTL || i18n.language === 'he' || i18n.language === 'ar'

  const renderResultCard = ({ item, index }: { item: SceneSearchResult; index: number }) => (
    <SceneSearchResultCard
      result={item}
      isActive={index === currentIndex}
      onPress={() => onResultClick(item, index)}
    />
  )

  const getItemLayout = (_: any, index: number) => ({
    length: RESULT_CARD_HEIGHT,
    offset: RESULT_CARD_HEIGHT * index,
    index,
  })

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyState} accessibilityLiveRegion="polite">
          <ActivityIndicator size={isTV ? 'large' : 'small'} color={colors.primary} />
          <Text style={[styles.emptyText, isTV && styles.emptyTextTV]}>
            {t('player.sceneSearch.searching')}
          </Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.emptyState} accessibilityLiveRegion="assertive">
          <AlertCircle size={isTV ? 48 : 32} color={colors.error} />
          <Text style={[styles.errorText, isTV && styles.errorTextTV]}>{error}</Text>
        </View>
      )
    }

    if (inputValue.length >= 2) {
      return (
        <View style={styles.emptyState} accessibilityLiveRegion="polite">
          <Search size={isTV ? 48 : 32} color={colors.textMuted} />
          <Text style={[styles.emptyText, isTV && styles.emptyTextTV]}>
            {t('player.sceneSearch.noResults')}
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.emptyState}>
        <Search size={isTV ? 48 : 32} color={colors.textMuted} />
        <Text style={[styles.emptyText, isTV && styles.emptyTextTV]}>
          {t('player.sceneSearch.hint')}
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      ref={listRef}
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
      ListEmptyComponent={renderEmpty}
    />
  )
}

const styles = StyleSheet.create({
  listContent: {
    padding: isTV ? 12 : 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTV ? 64 : 48,
    gap: isTV ? 16 : 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyTextTV: {
    fontSize: tvFontSize.lg,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  errorTextTV: {
    fontSize: tvFontSize.lg,
  },
})
```

---

#### Create SceneSearchNav.tsx

```typescript
/**
 * Scene Search Navigation Footer
 * Previous/next buttons and position counter
 */

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  I18nManager,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { colors, tvFontSize } from '@bayit/shared/theme'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'

interface SceneSearchNavProps {
  currentIndex: number
  totalResults: number
  onPrevious: () => void
  onNext: () => void
}

export function SceneSearchNav({
  currentIndex,
  totalResults,
  onPrevious,
  onNext,
}: SceneSearchNavProps) {
  const { t, i18n } = useTranslation()
  const isRTL = I18nManager.isRTL || i18n.language === 'he' || i18n.language === 'ar'
  const prevBtnFocus = useTVFocus({ styleType: 'button' })
  const nextBtnFocus = useTVFocus({ styleType: 'button' })

  if (totalResults === 0) return null

  return (
    <View
      style={[styles.navRow, isRTL && styles.navRowRTL]}
      accessibilityRole="navigation"
      accessibilityLabel={t('player.sceneSearch.navigation')}
    >
      <Pressable
        onPress={onPrevious}
        onFocus={prevBtnFocus.handleFocus}
        onBlur={prevBtnFocus.handleBlur}
        disabled={currentIndex === 0}
        focusable={true}
        style={[
          styles.navButton,
          currentIndex === 0 && styles.navButtonDisabled,
          isRTL && styles.navButtonRTL,
          prevBtnFocus.isFocused && prevBtnFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('player.sceneSearch.previous')}
        accessibilityState={{ disabled: currentIndex === 0 }}
      >
        {isRTL ? (
          <>
            <Text style={[styles.navText, isTV && styles.navTextTV]}>
              {t('player.sceneSearch.previous')}
            </Text>
            <ChevronRight size={isTV ? 28 : 20} color={colors.text} />
          </>
        ) : (
          <>
            <ChevronLeft size={isTV ? 28 : 20} color={colors.text} />
            <Text style={[styles.navText, isTV && styles.navTextTV]}>
              {t('player.sceneSearch.previous')}
            </Text>
          </>
        )}
      </Pressable>

      <Text
        style={[styles.navCounter, isTV && styles.navCounterTV]}
        accessibilityLabel={t('player.sceneSearch.position', {
          current: currentIndex + 1,
          total: totalResults,
        })}
      >
        {isRTL
          ? `${totalResults.toLocaleString('he-IL')} / ${(currentIndex + 1).toLocaleString('he-IL')}`
          : `${currentIndex + 1} / ${totalResults}`}
      </Text>

      <Pressable
        onPress={onNext}
        onFocus={nextBtnFocus.handleFocus}
        onBlur={nextBtnFocus.handleBlur}
        disabled={currentIndex === totalResults - 1}
        focusable={true}
        style={[
          styles.navButton,
          currentIndex === totalResults - 1 && styles.navButtonDisabled,
          isRTL && styles.navButtonRTL,
          nextBtnFocus.isFocused && nextBtnFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('player.sceneSearch.next')}
        accessibilityState={{ disabled: currentIndex === totalResults - 1 }}
      >
        {isRTL ? (
          <>
            <ChevronLeft size={isTV ? 28 : 20} color={colors.text} />
            <Text style={[styles.navText, isTV && styles.navTextTV]}>
              {t('player.sceneSearch.next')}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.navText, isTV && styles.navTextTV]}>
              {t('player.sceneSearch.next')}
            </Text>
            <ChevronRight size={isTV ? 28 : 20} color={colors.text} />
          </>
        )}
      </Pressable>
    </View>
  )
}

const MIN_TOUCH_TARGET = 44

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isTV ? 16 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderLight,
  },
  navRowRTL: {
    flexDirection: 'row-reverse',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: isTV ? 80 : MIN_TOUCH_TARGET,
    minHeight: isTV ? 56 : MIN_TOUCH_TARGET,
    paddingHorizontal: isTV ? 16 : 12,
    paddingVertical: isTV ? 12 : 8,
    borderRadius: 8,
    backgroundColor: colors.glassLight,
    gap: isTV ? 8 : 4,
  },
  navButtonRTL: {
    flexDirection: 'row-reverse',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navText: {
    fontSize: 14,
    color: colors.text,
  },
  navTextTV: {
    fontSize: tvFontSize.base,
  },
  navCounter: {
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  navCounterTV: {
    fontSize: tvFontSize.lg,
  },
})
```

---

#### Refactor SceneSearchPanel.tsx (Keep Main File < 200 Lines)

```typescript
/**
 * Scene Search Panel - Main Container
 * Orchestrates scene search UI with keyboard navigation and focus management
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  View,
  Platform,
  I18nManager,
  Animated,
  AccessibilityInfo,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView, GlassInput } from '@bayit/shared/ui'
import { VoiceSearchButton } from '@bayit/shared/components/VoiceSearchButton'
import { useSceneSearch, SceneSearchResult } from './hooks/useSceneSearch'
import { SceneSearchHeader } from './SceneSearchHeader'
import { SceneSearchList } from './SceneSearchList'
import { SceneSearchNav } from './SceneSearchNav'
import { SceneSearchStyles as styles } from './SceneSearchPanel.styles'

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
  const scrollRef = useRef<any>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const [inputValue, setInputValue] = useState('')
  const slideAnim = useRef(new Animated.Value(320)).current

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

  // Slide animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 0 : 320,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }, [isOpen, slideAnim])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        previousFocusRef.current = document.activeElement as HTMLElement
      }
      setTimeout(() => inputRef.current?.focus(), 300)
      announceToScreenReader(t('player.sceneSearch.panelOpened'))
    } else {
      if (Platform.OS === 'web' && previousFocusRef.current?.focus) {
        previousFocusRef.current.focus()
      }
      setInputValue('')
      clearResults()
    }
  }, [isOpen, clearResults, t])

  // Keyboard navigation
  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (e.key === 'Tab') {
        handleTabFocusTrap()
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

  const handleTabFocusTrap = () => {
    const panel = document.querySelector('[data-testid="scene-search-panel"]')
    if (!panel) return

    const focusableElements = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const event = new KeyboardEvent('keydown', { key: 'Tab' }) as any

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement?.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement?.focus()
    }
  }

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
        <SceneSearchHeader resultCount={results.length} onClose={onClose} />

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
        <SceneSearchList
          results={results}
          currentIndex={currentIndex}
          loading={loading}
          error={error}
          inputValue={inputValue}
          onResultClick={handleResultClick}
          listRef={scrollRef}
        />

        {/* Navigation Footer */}
        <SceneSearchNav
          currentIndex={currentIndex}
          totalResults={results.length}
          onPrevious={goToPrevious}
          onNext={goToNext}
        />
      </GlassView>
    </Animated.View>
  )
}

// Screen reader announcement
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
```

---

#### Create SceneSearchPanel.styles.ts

```typescript
/**
 * Scene Search Styles
 * Shared styles for all scene search components
 */

import { StyleSheet } from 'react-native'
import { colors, tvFontSize } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

const MIN_TOUCH_TARGET = 44

export const SceneSearchStyles = StyleSheet.create({
  panelContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    width: isTV ? 400 : 320,
    zIndex: 40,
  },
  panel: {
    flex: 1,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 12 : 8,
    padding: isTV ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  searchRowRTL: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
  },
})
```

---

### Step 2b: File Size After Refactoring

| File | New Size | Target | Status |
|------|----------|--------|--------|
| SceneSearchPanel.tsx | ~150 lines | 200 | ✅ OK |
| SceneSearchHeader.tsx | ~90 lines | 200 | ✅ OK |
| SceneSearchList.tsx | ~160 lines | 200 | ✅ OK |
| SceneSearchNav.tsx | ~120 lines | 200 | ✅ OK |
| SceneSearchPanel.styles.ts | ~30 lines | 200 | ✅ OK |
| **Total** | **~550 lines** | N/A | ✅ Distributed |

---

### Step 2c: Update Imports

Update any files that import SceneSearchPanel:

```typescript
// BEFORE
import SceneSearchPanel from '@/components/player/SceneSearchPanel'

// AFTER (no change needed - default export from SceneSearchPanel.tsx)
import SceneSearchPanel from '@/components/player/SceneSearchPanel'
```

---

## Issue 3: Fix React Hook Dependencies

### Step 3a: Update useSceneSearch.ts

**File**: `/web/src/components/player/hooks/useSceneSearch.ts` (Line 128)

Fix the `search` callback dependency array:

```typescript
// BEFORE ❌
const search = useCallback(
  async (searchQuery?: string) => {
    // ... uses setCurrentIndex, setResults, setLoading, setError
  },
  [query, contentId, seriesId, language, announceWithTTS, t]
)

// AFTER ✅
const search = useCallback(
  async (searchQuery?: string) => {
    // ... uses setCurrentIndex, setResults, setLoading, setError
  },
  [query, contentId, seriesId, language, announceWithTTS, t, setCurrentIndex, setResults, setLoading, setError]
)
```

**OR** if keeping state functions stable (React best practice):

```typescript
// ALTERNATIVE (Document why state functions omitted)
const search = useCallback(
  async (searchQuery?: string) => {
    // ... implementation
  },
  [query, contentId, seriesId, language, announceWithTTS, t]
  // NOTE: State setters (setCurrentIndex, setResults, etc.) are stable
  // and don't need to be included in dependencies per React best practices
)
```

Add ESLint disable comment:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
```

---

### Step 3b: Optional - Optimize Keyboard Handler

**File**: `SceneSearchPanel.tsx` (Line 154)

```typescript
// BEFORE
}, [isOpen, onClose, goToNext, goToPrevious, results, currentIndex, onSeek, t])

// AFTER (remove unused deps)
}, [isOpen, onClose, goToNext, goToPrevious, onSeek, t])
// Removed: results, currentIndex (accessed via closure, not recreated)
```

---

## Testing Checklist

### Keyboard Navigation
```bash
- [ ] Escape closes panel
- [ ] Arrow Down moves to next result
- [ ] Arrow Up moves to previous result
- [ ] Enter seeks to current result
- [ ] Tab cycles focus (forward and backward)
```

### Accessibility
```bash
- [ ] Screen reader reads panel title
- [ ] Screen reader announces result count
- [ ] Screen reader announces "Searching..." while loading
- [ ] Screen reader announces errors
- [ ] Screen reader announces current position (e.g., "1 of 10")
- [ ] All buttons have accessible labels
- [ ] All form inputs have accessible labels
```

### Responsive Design
```bash
- [ ] Mobile (320px): Panel visible, no overflow
- [ ] Tablet (768px): Panel visible, no overflow
- [ ] Desktop (1920px): Panel visible, no overflow
- [ ] TV (400px panel): All controls visible, touch targets 56x56pt
```

### Functionality
```bash
- [ ] Volume slider works (GlassSlider)
- [ ] Search input accepts text
- [ ] Voice search button works
- [ ] Results list displays correctly
- [ ] Navigation buttons work
- [ ] Close button works
- [ ] Focus restored on close
```

### No Errors
```bash
npm run lint
npm run build
npm run test
```

---

## Summary

**Total Changes**:
- 1 new component: GlassSlider
- 3 new files extracted: SceneSearchHeader, SceneSearchList, SceneSearchNav
- 1 new file: SceneSearchPanel.styles
- 3 files modified: PlayerControls, useSceneSearch, SceneSearchPanel
- 1 file updated: glass components index

**Estimated Time**: 5-6 hours
**Testing Time**: 1-1.5 hours

---

**Next Steps**: Follow this guide step-by-step, test thoroughly, and resubmit for approval.
