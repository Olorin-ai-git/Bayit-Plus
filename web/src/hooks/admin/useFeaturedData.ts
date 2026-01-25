import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { adminContentService, Content } from '@/services/adminApi'
import logger from '@/utils/logger'

type ContentType = 'all' | 'movie' | 'series'

export function useFeaturedData() {
  const { t } = useTranslation()
  const notifications = useNotifications()

  const [items, setItems] = useState<Content[]>([])
  const [originalItems, setOriginalItems] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<ContentType>('all')
  const [hasChanges, setHasChanges] = useState(false)

  const loadFeaturedContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await adminContentService.getContent({
        is_featured: true,
        page_size: 100,
      })
      const sortedItems = (response.items || []).sort((a, b) =>
        (a.featured_order ?? 999) - (b.featured_order ?? 999)
      )
      setItems(sortedItems)
      setOriginalItems(sortedItems)
      setHasChanges(false)
      logger.info('Featured content loaded', { count: sortedItems.length })
    } catch (err: unknown) {
      const errorObj = err as { detail?: string; message?: string }
      const msg = errorObj?.detail || errorObj?.message || 'Failed to load featured content'
      logger.error('Failed to load featured content', { error: err })
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeaturedContent()
  }, [loadFeaturedContent])

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prevItems => {
      const newItems = [...prevItems]
      const [removed] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, removed)
      logger.debug('Items reordered', { fromIndex, toIndex })
      return newItems
    })
    setHasChanges(true)
  }, [])

  const handleSaveOrder = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const updatePromises = items.map((item, index) =>
        adminContentService.updateContent(item.id, { featured_order: index })
      )
      await Promise.all(updatePromises)
      setOriginalItems(items)
      setHasChanges(false)
      logger.info('Featured order saved', { count: items.length })
    } catch (err: unknown) {
      const errorObj = err as { detail?: string; message?: string }
      const msg = errorObj?.detail || errorObj?.message || 'Failed to save order'
      logger.error('Failed to save order', { error: err })
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveFromFeatured = useCallback((item: Content) => {
    notifications.show({
      level: 'warning',
      message: t('admin.featured.confirmUnfeature'),
      dismissable: true,
      action: {
        label: t('admin.featured.remove'),
        type: 'action',
        onPress: async () => {
          try {
            await adminContentService.featureContent(item.id)
            await loadFeaturedContent()
            logger.info('Item removed from featured', { id: item.id, title: item.title })
          } catch (err: unknown) {
            const errorObj = err as { detail?: string; message?: string }
            const msg = errorObj?.message || 'Failed to remove from featured'
            logger.error('Failed to remove from featured', { error: err, id: item.id })
            setError(msg)
          }
        },
      },
    })
  }, [t, notifications, loadFeaturedContent])

  const filteredItems = items.filter(item => {
    if (filterType === 'all') return true
    const isSeries = item.stream_type === 'series' || Boolean(item.genre?.includes('Series'))
    if (filterType === 'series') return isSeries
    if (filterType === 'movie') return !isSeries
    return true
  })

  return {
    items,
    originalItems,
    filteredItems,
    isLoading,
    isSaving,
    error,
    filterType,
    hasChanges,
    setFilterType,
    setError,
    handleReorder,
    handleSaveOrder,
    handleRemoveFromFeatured,
    refresh: loadFeaturedContent,
  }
}
