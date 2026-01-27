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

  const handleAddToSection = useCallback(
    async (sectionId: string, contentIds: string[]) => {
      if (contentIds.length === 0) return

      try {
        const section = sections.find((s) => s.section_id === sectionId)
        if (!section) throw new Error('Section not found')

        // Calculate starting order (append to end)
        const maxOrder = section.items.length > 0 ? section.items.length - 1 : -1

        // Fetch full content objects for new items
        const contentPromises = contentIds.map(async (id) => {
          const response = await axios.get(`${API_BASE_URL}/admin/content/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          return response.data
        })

        const newContentItems: Content[] = await Promise.all(contentPromises)

        // OPTIMISTIC UPDATE
        setSections((prevSections) =>
          prevSections.map((s) => {
            if (s.section_id !== sectionId) return s
            return {
              ...s,
              items: [...s.items, ...newContentItems],
              hasChanges: true,
            }
          })
        )

        // Prepare API payload
        const existingItems = section.items.map((item, idx) => ({
          content_id: item.id,
          order: idx,
        }))

        const newItems = contentIds.map((contentId, idx) => ({
          content_id: contentId,
          order: maxOrder + 1 + idx,
        }))

        const payload = {
          sections: [
            {
              section_id: sectionId,
              items: [...existingItems, ...newItems],
            },
          ],
        }

        // API CALL
        await axios.post(`${API_BASE_URL}/admin/batch/featured-order`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        logger.info('Content added to section', { sectionId, count: contentIds.length })

        // Refresh from backend to ensure consistency
        await loadFeaturedContent()
      } catch (err: unknown) {
        // ROLLBACK optimistic update
        await loadFeaturedContent()

        let msg = 'Failed to add content to section'
        if (axios.isAxiosError(err)) {
          msg = err.response?.data?.detail || err.message || msg
        } else if (err instanceof Error) {
          msg = err.message
        }
        logger.error('Failed to add content', { error: err })
        setError(msg)
        throw err
      }
    },
    [sections, token, loadFeaturedContent]
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
    handleAddToSection,
    handleSaveAllSections,
    refresh: loadFeaturedContent,
  }
}
