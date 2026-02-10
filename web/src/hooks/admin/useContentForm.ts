import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { adminContentService } from '@/services/adminApi'
import logger from '@/utils/logger'
import type { Content } from '@/types/content'

export function useContentForm(contentId?: string) {
  const navigate = useNavigate()
  const { t} = useTranslation()
  const notifications = useNotifications()
  const log = logger.scope('ContentForm')

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
        log.error('Notification fallback', { title, message })
      }
    },
    showSuccess: (message: string, title?: string) => {
      if (notifications?.showSuccess) {
        notifications.showSuccess(message, title || 'Success')
      } else {
        log.info('Notification fallback', { title, message })
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
    is_published: false,
    is_featured: false,
    is_kids_content: false,
    requires_subscription: 'basic',
  })

  useEffect(() => {
    if (contentId) {
      log.debug('contentId detected, loading content', { contentId })
      loadContent()
    } else {
      log.debug('No contentId, showing empty form for new content')
    }
  }, [contentId])

  // Debug: Log formData changes
  useEffect(() => {
    log.debug('formData state updated', {
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
      log.debug('Loading content for edit', { contentId })
      const data = await adminContentService.getContentById(contentId!)
      log.debug('Content loaded from API', data)
      log.debug('Setting form data', {
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

      log.debug('Sanitized data', {
        rating: sanitizedData.rating,
        ratingType: typeof sanitizedData.rating,
      })

      setFormData(sanitizedData as any)
      log.debug('Form data updated')
      log.info('Content loaded for editing', { contentId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load content'
      log.error('Failed to load content', err)
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
    log.info('handleSubmit called', {
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
      log.warn('Validation failed - title missing', {
        title: formData.title
      })
      setError(msg)
      showNotification.showError(msg, 'Validation Error')
      return
    }

    if (!contentId && !formData.stream_url) {
      const msg = t('admin.content.validation.streamUrlRequired', 'Stream URL is required for new content')
      log.warn('Validation failed - stream_url missing for new content', {
        stream_url: formData.stream_url
      })
      setError(msg)
      showNotification.showError(msg, 'Validation Error')
      return
    }

    log.debug('Validation passed, submitting', { contentId, isUpdate: !!contentId })

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

      log.debug('Submitting to API', { contentId, sanitizedPayload })

      if (contentId) {
        log.debug('Calling updateContent API', { contentId })
        const result = await adminContentService.updateContent(contentId, sanitizedPayload as any)
        log.debug('Update successful', result)
        showNotification.showSuccess(
          t('admin.content.updateSuccess', 'Content updated successfully'),
          'Success'
        )
        log.info('Content updated', { contentId })
      } else {
        log.debug('Calling createContent API')
        const result = await adminContentService.createContent(sanitizedPayload as any)
        log.debug('Create successful', result)
        showNotification.showSuccess(
          t('admin.content.createSuccess', 'Content created successfully'),
          'Success'
        )
        log.info('Content created', { title: formData.title })
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/admin/content')
      }, 1500)
    } catch (err: any) {
      log.error('Save failed', err)
      log.debug('Error details', {
        keys: Object.keys(err || {}),
        detail: err?.detail,
        response: err?.response,
        responseData: err?.response?.data,
      })

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

      log.error('Final error message', { msg, contentId })
      setError(msg)
      showNotification.showError(msg, 'Error')
    } finally {
      log.debug('Submission complete, setting isSubmitting to false')
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
