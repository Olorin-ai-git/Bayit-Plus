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
      console.log('[ContentForm] contentId detected, loading content...', { contentId })
      loadContent()
    } else {
      console.log('[ContentForm] No contentId, showing empty form for new content')
    }
  }, [contentId])

  // Debug: Log formData changes
  useEffect(() => {
    console.log('[ContentForm] formData state updated:', {
      title: formData.title,
      stream_url: formData.stream_url,
      thumbnail: formData.thumbnail,
      backdrop: formData.backdrop,
      hasData: Object.keys(formData).length > 0,
    })
  }, [formData])

  const loadContent = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('[ContentForm] Loading content for edit...', { contentId })
      const data = await adminContentService.getContentById(contentId!)
      console.log('[ContentForm] Content loaded from API:', data)
      console.log('[ContentForm] Setting form data with:', {
        title: data.title,
        stream_url: data.stream_url,
        thumbnail: data.thumbnail,
        backdrop: data.backdrop,
        is_published: data.is_published,
        rating: data.rating,
        ratingType: typeof data.rating,
      })

      // Convert numeric fields to strings for backend compatibility
      const sanitizedData = {
        ...data,
        rating: data.rating != null ? String(data.rating) : undefined,
        year: data.year != null ? Number(data.year) : undefined,
      }

      console.log('[ContentForm] Sanitized data:', {
        rating: sanitizedData.rating,
        ratingType: typeof sanitizedData.rating,
      })

      setFormData(sanitizedData)
      console.log('[ContentForm] Form data updated')
      logger.info('Content loaded for editing', { contentId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load content'
      console.error('[ContentForm] Failed to load content:', err)
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
    console.log('[ContentForm] ===== HANDLE SUBMIT CALLED =====')
    logger.info('handleSubmit called', {
      formData: {
        title: formData.title,
        stream_url: formData.stream_url,
        hasTitle: !!formData.title,
        hasStreamUrl: !!formData.stream_url
      }
    })

    // For new content, require both title and stream_url
    // For editing existing content, only require title
    if (!formData.title) {
      const msg = t('admin.content.validation.titleRequired', 'Title is required')
      logger.warn('Validation failed - title missing', {
        title: formData.title
      })
      console.error('[ContentForm] Validation failed: title missing')
      setError(msg)
      showNotification.showError(msg, 'Validation Error')
      return
    }

    if (!contentId && !formData.stream_url) {
      const msg = t('admin.content.validation.streamUrlRequired', 'Stream URL is required for new content')
      logger.warn('Validation failed - stream_url missing for new content', {
        stream_url: formData.stream_url
      })
      console.error('[ContentForm] Validation failed: stream_url missing for new content')
      setError(msg)
      showNotification.showError(msg, 'Validation Error')
      return
    }

    console.log('[ContentForm] Validation passed, submitting...', { contentId, isUpdate: !!contentId })

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(false)

      // Sanitize data before sending to API
      const sanitizedPayload = {
        ...formData,
        // Ensure rating is a string if present
        rating: formData.rating != null ? String(formData.rating) : undefined,
        // Ensure year is a number if present
        year: formData.year != null ? Number(formData.year) : undefined,
        // Remove undefined values
      }

      // Remove undefined values from payload
      Object.keys(sanitizedPayload).forEach(key => {
        if (sanitizedPayload[key as keyof typeof sanitizedPayload] === undefined) {
          delete sanitizedPayload[key as keyof typeof sanitizedPayload]
        }
      })

      console.log('[ContentForm] Submitting to API...', { contentId, sanitizedPayload })

      if (contentId) {
        console.log('[ContentForm] Calling updateContent API...', { contentId })
        const result = await adminContentService.updateContent(contentId, sanitizedPayload)
        console.log('[ContentForm] Update successful:', result)
        showNotification.showSuccess(
          t('admin.content.updateSuccess', 'Content updated successfully'),
          'Success'
        )
        logger.info('Content updated', { contentId })
      } else {
        console.log('[ContentForm] Calling createContent API...')
        const result = await adminContentService.createContent(sanitizedPayload as Content)
        console.log('[ContentForm] Create successful:', result)
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
    } catch (err: any) {
      console.error('[ContentForm] Save failed - Full error:', err)
      console.error('[ContentForm] Error keys:', Object.keys(err || {}))
      console.error('[ContentForm] Error.detail:', err?.detail)
      console.error('[ContentForm] Error.response:', err?.response)
      console.error('[ContentForm] Error.response.data:', err?.response?.data)

      let msg = 'Failed to save content'

      // Check if error.detail exists (axios interceptor might have unwrapped it)
      if (err?.detail) {
        if (Array.isArray(err.detail)) {
          msg = err.detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ')
        } else if (typeof err.detail === 'string') {
          msg = err.detail
        }
      }
      // Check traditional response structure
      else if (err?.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          msg = err.response.data.detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ')
        } else if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail
        }
      }
      // Fallback to error message
      else if (err instanceof Error) {
        msg = err.message
      }

      console.error('[ContentForm] Final error message:', msg)
      logger.error('Failed to save content', { error: err, contentId })
      setError(msg)
      showNotification.showError(msg, 'Error')
    } finally {
      console.log('[ContentForm] Submission complete, setting isSubmitting to false')
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
