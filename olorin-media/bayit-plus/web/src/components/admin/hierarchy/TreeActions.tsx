/**
 * TreeActions - Action buttons and utilities for hierarchical content table
 * Handles selection, language mapping, and batch operations
 */

import { useState, useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { GlassCheckbox } from '@bayit/shared/ui/web'
import { z } from 'zod'

// Language flag mapping
export const getLanguageFlag = (lang: string): string => {
  const flags: Record<string, string> = {
    'he': '🇮🇱',
    'en': '🇺🇸',
    'ar': '🇸🇦',
    'ru': '🇷🇺',
    'es': '🇪🇸',
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'zh': '🇨🇳',
    'ja': '🇯🇵',
    'ko': '🇰🇷',
  }
  return flags[lang] || '🌐'
}

// Language name mapping
export const getLanguageName = (lang: string): string => {
  const names: Record<string, string> = {
    'he': 'Hebrew',
    'en': 'English',
    'ar': 'Arabic',
    'ru': 'Russian',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
  }
  return names[lang] || lang
}

interface SelectionHeaderProps {
  allSelected: boolean
  someSelected: boolean
  onSelectAll: () => void
}

export function SelectionHeader({ allSelected, someSelected, onSelectAll }: SelectionHeaderProps) {
  return (
    <View className="items-center justify-center min-h-[40px] relative">
      <GlassCheckbox checked={allSelected} onChange={onSelectAll} />
      {someSelected && (
        <View className="absolute bottom-1 w-3 h-0.5 bg-blue-500 rounded-sm" />
      )}
    </View>
  )
}

interface UseSelectionResult {
  selectedSet: Set<string>
  allPageSelected: boolean
  somePageSelected: boolean
  handleSelectRow: (id: string) => void
  handleSelectAll: () => void
}

/**
 * Hook to manage row selection state
 */
export function useSelection(
  items: Array<{ id: string }>,
  selectedIds: string[],
  onSelectionChange?: (selectedIds: string[]) => void
): UseSelectionResult {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const handleSelectRow = useCallback(
    (id: string) => {
      if (!onSelectionChange) return

      const newSelected = new Set(selectedSet)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      onSelectionChange(Array.from(newSelected))
    },
    [selectedSet, onSelectionChange]
  )

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return

    const contentIds = items.map((item) => item.id)
    const allSelected = contentIds.every((id) => selectedSet.has(id))

    if (allSelected) {
      // Deselect all content items from this page
      const newSelected = new Set(selectedSet)
      contentIds.forEach((id) => newSelected.delete(id))
      onSelectionChange(Array.from(newSelected))
    } else {
      // Select all content items on this page
      const newSelected = new Set([...selectedSet, ...contentIds])
      onSelectionChange(Array.from(newSelected))
    }
  }, [items, selectedSet, onSelectionChange])

  const allPageSelected = useMemo(() => {
    if (items.length === 0) return false
    return items.every((item) => selectedSet.has(item.id))
  }, [items, selectedSet])

  const somePageSelected = useMemo(() => {
    return items.some((item) => selectedSet.has(item.id)) && !allPageSelected
  }, [items, selectedSet, allPageSelected])

  return {
    selectedSet,
    allPageSelected,
    somePageSelected,
    handleSelectRow,
    handleSelectAll,
  }
}

// Validation schemas for type safety
export const SelectionStateSchema = z.object({
  selectedIds: z.array(z.string()),
  allSelected: z.boolean(),
  someSelected: z.boolean(),
})

export type SelectionState = z.infer<typeof SelectionStateSchema>
