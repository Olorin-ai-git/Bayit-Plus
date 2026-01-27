import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { adminContentService, Content } from '@/services/adminApi'
import { useAuthStore } from '@/stores/authStore'
import logger from '@/utils/logger'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

interface SectionFeaturedState {
  section_id: string
  slug: string
  name_key: string
  order: number
  items: Content[]
  originalItems: Content[]
  hasChanges: boolean
}

interface FeaturedSection {
  section_id: string
  slug: string
  name_key: string
  order: number
  item_count: number
  items: Content[]
}

export function useFeaturedData() {
  const { t } = useTranslation()
  const notifications = useNotifications()
  const token = useAuthStore((state) => state.token)

  const [sections, setSections] = useState<SectionFeaturedState[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFeaturedContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/featured-by-sections`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const data = response.data
      const sectionStates = (data.sections || []).map((section: FeaturedSection) => ({
        section_id: section.section_id,
        slug: section.slug,
        name_key: section.name_key,
        order: section.order,
        items: section.items,
        originalItems: section.items.map(item => ({ ...item })),
        hasChanges: false,
      }))

      setSections(sectionStates)
      logger.info('Featured content loaded', { sections: sectionStates.length })
    } catch (err: unknown) {
      let msg = 'Failed to load featured content'
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail || err.message || msg
      } else if (err instanceof Error) {
        msg = err.message
      }
      logger.error('Failed to load featured content', { error: err })
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadFeaturedContent()
  }, [loadFeaturedContent])

  const handleReorder = useCallback((sectionId: string, fromIndex: number, toIndex: number) => {
    setSections(prevSections =>
      prevSections.map(section => {
        if (section.section_id !== sectionId) return section

        const newItems = [...section.items]
        const [removed] = newItems.splice(fromIndex, 1)
        newItems.splice(toIndex, 0, removed)

        logger.debug('Items reordered in section', { sectionId, fromIndex, toIndex })
        return { ...section, items: newItems, hasChanges: true }
      })
    )
  }, [])

  const handleRemoveFromSection = useCallback(
    (sectionId: string, contentId: string) => {
      setSections(prevSections =>
        prevSections.map(section => {
          if (section.section_id !== sectionId) return section

          const newItems = section.items.filter(item => item.id !== contentId)
          return { ...section, items: newItems, hasChanges: true }
        })
      )

      logger.info('Item removed from section', { sectionId, contentId })
    },
    []
  )

  const handleSaveAllSections = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    const changedSections = sections.filter(s => s.hasChanges)
    if (changedSections.length === 0) {
      setIsSaving(false)
      return
    }

    try {
      const payload = {
        sections: changedSections.map(section => ({
          section_id: section.section_id,
          items: section.items.map((item, index) => ({
            content_id: item.id,
            order: index,
          })),
        })),
      }

      const response = await axios.post(`${API_BASE_URL}/admin/batch/featured-order`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      setSections(prevSections =>
        prevSections.map(section => ({
          ...section,
          originalItems: section.items.map(item => ({ ...item })),
          hasChanges: false,
        }))
      )

      logger.info('Featured order saved', { sections: changedSections.length })
    } catch (err: unknown) {
      let msg = 'Failed to save featured order'
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail || err.message || msg
      } else if (err instanceof Error) {
        msg = err.message
      }
      logger.error('Failed to save featured order', { error: err })
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }, [sections, token])

  const hasAnyChanges = useMemo(() => sections.some(s => s.hasChanges), [sections])
  const changedSectionCount = useMemo(() => sections.filter(s => s.hasChanges).length, [sections])

  return {
    sections,
    isLoading,
    isSaving,
    error,
    hasAnyChanges,
    changedSectionCount,
    setError,
    handleReorder,
    handleRemoveFromSection,
    handleSaveAllSections,
    refresh: loadFeaturedContent,
  }
}
