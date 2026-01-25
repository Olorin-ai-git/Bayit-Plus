import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { adminContentService } from '@/services/adminApi'
import logger from '@/utils/logger'
import type { Content } from '@/types/content'

export function useContentForm(contentId?: string) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const notifications = useNotifications()

  const [isLoading, setIsLoading] = useState(!!contentId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Safe notification helpers
  const showNotification = {
    showError: (message: string, title?: string) => {
      if (notifications?.showError) {
        notifications.showError(message, title || 'Error')
      } else {
        console.error('[Notification]', title, message)
      }
    },
    showSuccess: (message: string, title?: string) => {
      if (notifications?.showSuccess) {
        notifications.showSuccess(message, title || 'Success')
      } else {
        console.log('[Notification]', title, message)
      }
    },
  }

  const [formData, setFormData] = useState<Partial<Content>>({
    title: '',
    description: '',
    thumbnail: '',
    backdrop: '',
    stream_url: '',
    stream_type: 'hls',
    is_drm_protected: false,
    is_series: false,
    is_published: false,
    is_featured: false,
    is_kids_content: false,
    requires_subscription: 'basic',
  })

  useEffect(() => {
    if (contentId) {
      loadContent()
    }
  }, [contentId])

  const loadContent = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await adminContentService.getContentById(contentId!)
      setFormData(data)
      logger.info('Content loaded for editing', { contentId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load content'
      logger.error('Failed to load content', { error: err, contentId })
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.stream_url || !formData.category_id) {
      const msg = t('admin.content.validation.requiredFields', 'Please fill all required fields')
      setError(msg)
      showNotification.showError(msg, 'Validation Error')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(false)

      if (contentId) {
        await adminContentService.updateContent(contentId, formData)
        showNotification.showSuccess(
          t('admin.content.updateSuccess', 'Content updated successfully'),
          'Success'
        )
        logger.info('Content updated', { contentId })
      } else {
        await adminContentService.createContent(formData as Content)
        showNotification.showSuccess(
          t('admin.content.createSuccess', 'Content created successfully'),
          'Success'
        )
        logger.info('Content created', { title: formData.title })
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/admin/content')
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save content'
      logger.error('Failed to save content', { error: err, contentId })
      setError(msg)
      showNotification.showError(msg, 'Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/admin/content')
  }

  return {
    formData,
    isLoading,
    isSubmitting,
    error,
    success,
    setError,
    handleInputChange,
    handleSubmit,
    handleCancel,
    isEditing: !!contentId,
  }
}
