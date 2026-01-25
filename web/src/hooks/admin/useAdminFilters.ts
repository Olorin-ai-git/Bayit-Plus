import { useState, useCallback } from 'react'
import logger from '@/utils/logger'

export function useAdminFilters(initialFilters: Record<string, any> = {}) {
  const [filters, setFilters] = useState(initialFilters)
  const [showDropdown, setShowDropdown] = useState(false)

  const toggleDropdown = useCallback(() => {
    setShowDropdown((prev) => !prev)
  }, [])

  const applyFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setShowDropdown(false)
    logger.info('Filters applied', { filters: newFilters })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setShowDropdown(false)
    logger.info('Filters cleared')
  }, [])

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
    logger.debug('Filter updated', { key, value })
  }, [])

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
    logger.debug('Filter removed', { key })
  }, [])

  return {
    filters,
    showDropdown,
    toggleDropdown,
    applyFilters,
    clearFilters,
    updateFilter,
    removeFilter,
  }
}
