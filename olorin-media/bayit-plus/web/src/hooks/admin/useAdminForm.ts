import { useState, useCallback } from 'react'
import logger from '@/utils/logger'

interface UseAdminFormOptions<T> {
  initialData?: T
  onSubmit: (data: T) => Promise<void>
  validate?: (data: T) => Record<string, string> | null
}

export function useAdminForm<T extends Record<string, any>>({
  initialData,
  onSubmit,
  validate,
}: UseAdminFormOptions<T>) {
  const [formData, setFormData] = useState<T>(initialData || ({} as T))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback((field: keyof T, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error for this field when user starts typing
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field as string]
      return newErrors
    })

    logger.debug('Form field changed', { field: String(field), valueType: typeof value })
  }, [])

  const handleSubmit = useCallback(async () => {
    // Validate if validation function provided
    if (validate) {
      const validationErrors = validate(formData)
      if (validationErrors) {
        setErrors(validationErrors)
        logger.warn('Form validation failed', { errors: validationErrors })
        return
      }
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await onSubmit(formData)
      logger.info('Form submitted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit form'
      setErrors({ _general: errorMessage })
      logger.error('Form submission failed', { error: err })
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit, validate])

  const resetForm = useCallback(() => {
    setFormData(initialData || ({} as T))
    setErrors({})
    setIsSubmitting(false)
    logger.debug('Form reset')
  }, [initialData])

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
    setFormData,
  }
}
