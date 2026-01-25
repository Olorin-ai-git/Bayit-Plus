import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { adminContentService } from '@/services/adminApi'
import logger from '@/utils/logger'
import type { Category, PaginatedResponse } from '@/types/content'

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface EditingCategory extends Partial<Category> {
  id?: string
}

export function useCategoriesData() {
  const { t } = useTranslation()
  const notifications = useNotifications()

  const [items, setItems] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingCategory>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response: PaginatedResponse<Category> = await adminContentService.getCategories({
        page: pagination.page,
        page_size: pagination.pageSize,
      })
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
      logger.info('Categories loaded', { count: response.items?.length || 0 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load categories'
      logger.error('Failed to load categories', { error: err })
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleNew = useCallback(() => {
    setEditingId('new')
    setEditData({ is_active: true, order: items.length + 1 })
    logger.debug('New category form opened')
  }, [items.length])

  const handleEdit = useCallback((item: Category) => {
    setEditingId(item.id)
    setEditData(item)
    logger.debug('Edit category form opened', { categoryId: item.id })
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditData({})
    logger.debug('Edit form cancelled')
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editData.name) {
      const msg = t('admin.content.validation.nameRequired', 'Name is required')
      setError(msg)
      notifications.showError(msg, 'Validation Error')
      return
    }

    try {
      if (editingId === 'new') {
        await adminContentService.createCategory(editData)
        notifications.showSuccess(t('admin.categories.createSuccess', 'Category created'), 'Success')
        logger.info('Category created', { name: editData.name })
      } else {
        await adminContentService.updateCategory(editingId!, editData)
        notifications.showSuccess(t('admin.categories.updateSuccess', 'Category updated'), 'Success')
        logger.info('Category updated', { categoryId: editingId })
      }

      setEditingId(null)
      setEditData({})
      await loadCategories()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save category'
      logger.error('Failed to save category', { error: err, editingId })
      setError(msg)
      notifications.showError(msg, 'Error')
    }
  }, [editData, editingId, loadCategories, notifications, t])

  const handleDelete = useCallback((id: string) => {
    notifications.show({
      level: 'warning',
      title: t('common.confirm', 'Confirm'),
      message: t('admin.content.confirmDelete', 'Are you sure you want to delete this item?'),
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action' as const,
        onPress: async () => {
          try {
            setDeleting(id)
            await adminContentService.deleteCategory(id)
            setItems(items.filter((item) => item.id !== id))
            notifications.showSuccess(t('admin.content.deleteSuccess', 'Category deleted'), 'Success')
            logger.info('Category deleted', { categoryId: id })
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete category'
            logger.error('Failed to delete category', { error: err, categoryId: id })
            setError(msg)
            notifications.showError(msg, 'Error')
          } finally {
            setDeleting(null)
          }
        },
      },
      dismissable: true,
    })
  }, [items, notifications, t])

  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }, [])

  const handleEditDataChange = useCallback((updates: Partial<EditingCategory>) => {
    setEditData((prev) => ({ ...prev, ...updates }))
  }, [])

  return {
    items,
    isLoading,
    error,
    pagination,
    editingId,
    editData,
    deleting,
    setError,
    handleNew,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleDelete,
    handlePageChange,
    handleEditDataChange,
    refresh: loadCategories,
  }
}
