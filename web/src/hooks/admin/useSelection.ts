import { useState, useCallback } from 'react'
import logger from '@/utils/logger'

export function useSelection(initialSelectedIds: string[] = []) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      if (selected) {
        const newSelection = [...prev, id]
        logger.debug('Item selected', { id, totalSelected: newSelection.length })
        return newSelection
      } else {
        const newSelection = prev.filter((selectedId) => selectedId !== id)
        logger.debug('Item deselected', { id, totalSelected: newSelection.length })
        return newSelection
      }
    })
  }, [])

  const handleSelectAll = useCallback((allIds: string[], selected: boolean) => {
    if (selected) {
      setSelectedIds(allIds)
      logger.debug('All items selected', { count: allIds.length })
    } else {
      setSelectedIds([])
      logger.debug('All items deselected')
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    logger.debug('Selection cleared')
  }, [])

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  )

  const isAllSelected = useCallback(
    (allIds: string[]) => allIds.length > 0 && allIds.every((id) => selectedIds.includes(id)),
    [selectedIds]
  )

  return {
    selectedIds,
    handleSelect,
    handleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
  }
}
