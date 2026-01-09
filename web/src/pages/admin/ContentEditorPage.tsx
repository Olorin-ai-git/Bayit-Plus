import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, AlertCircle, Save } from 'lucide-react'
import { contentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'
import logger from '@/utils/logger'
import type { Content } from '@/types/content'

export default function ContentEditorPage() {
  const navigate = useNavigate()
  const { contentId } = useParams<{ contentId?: string }>()
  const { t } = useTranslation()
  const { textAlign, flexDirection } = useDirection()

  const [isLoading, setIsLoading] = useState(!!contentId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<Partial<Content>>({
    title: '',
    description: '',
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
      const data = await contentService.getContentItem(contentId!)
      setFormData(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load content'
      logger.error(msg, 'ContentEditorPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.stream_url || !formData.category_id) {
      setError(t('admin.content.validation.requiredFields', { defaultValue: 'Please fill all required fields' }))
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(false)

      if (contentId) {
        await contentService.updateContent(contentId, formData)
      } else {
        await contentService.createContent(formData as Content)
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/admin/content')
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save content'
      logger.error(msg, 'ContentEditorPage', err)
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const isEditing = !!contentId

  if (isLoading && error) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Pressable
          onPress={() => navigate('/admin/content')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.primary} />
          <Text style={styles.backText}>{t('admin.actions.back', { defaultValue: 'Back to Content' })}</Text>
        </Pressable>
        <View style={[styles.errorContainer, styles.errorBox]}>
          <AlertCircle size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </ScrollView>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('admin.actions.loading', { defaultValue: 'Loading...' })}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <Pressable
          onPress={() => navigate('/admin/content')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { textAlign }]}>
            {isEditing
              ? t('admin.titles.editContent', { defaultValue: 'Edit Content' })
              : t('admin.titles.newContent', { defaultValue: 'Add New Content' })}
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {isEditing
              ? t('admin.content.editSubtitle', { defaultValue: 'Update the content details and media' })
              : t('admin.content.newSubtitle', { defaultValue: 'Create a new movie, series, or other video content' })}
          </Text>
        </View>
      </View>

      {/* Error Message */}
      {error && !isLoading && (
        <View style={[styles.errorContainer, styles.errorBox]}>
          <AlertCircle size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Success Message */}
      {success && (
        <View style={[styles.successContainer, styles.successBox]}>
          <Text style={styles.successText}>
            {isEditing
              ? t('admin.content.updateSuccess', { defaultValue: 'Content updated successfully. Redirecting...' })
              : t('admin.content.createSuccess', { defaultValue: 'Content created successfully. Redirecting...' })}
          </Text>
        </View>
      )}

      {/* Form Container */}
      <View style={styles.formContainer}>
        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.content.basicInfo', { defaultValue: 'Basic Information' })}</Text>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('admin.content.fields.title', { defaultValue: 'Title' })}
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('admin.content.fields.titlePlaceholder', { defaultValue: 'Content title' })}
              placeholderTextColor={colors.textMuted}
              value={formData.title || ''}
              onChangeText={(value) => handleInputChange('title', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Year */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.fields.year', { defaultValue: 'Year' })}</Text>
            <TextInput
              style={styles.input}
              placeholder="2024"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.year ? String(formData.year) : ''}
              onChangeText={(value) => handleInputChange('year', value ? parseInt(value) : undefined)}
              editable={!isSubmitting}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.fields.description', { defaultValue: 'Description' })}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={t('admin.content.fields.descriptionPlaceholder', { defaultValue: 'Content description' })}
              placeholderTextColor={colors.textMuted}
              value={formData.description || ''}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
              editable={!isSubmitting}
            />
          </View>
        </View>

        {/* Streaming Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.content.streaming', { defaultValue: 'Streaming' })}</Text>

          {/* Stream URL */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('admin.content.fields.streamUrl', { defaultValue: 'Stream URL' })}
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('admin.content.fields.streamUrlPlaceholder', { defaultValue: 'https://example.com/stream.m3u8' })}
              placeholderTextColor={colors.textMuted}
              value={formData.stream_url || ''}
              onChangeText={(value) => handleInputChange('stream_url', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Stream Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.fields.streamType', { defaultValue: 'Stream Type' })}</Text>
            <View style={styles.typeButtons}>
              {(['hls', 'dash'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => handleInputChange('stream_type', type)}
                  style={[
                    styles.typeButton,
                    formData.stream_type === type && styles.typeButtonActive,
                  ]}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.stream_type === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* DRM Protected */}
          <Pressable
            onPress={() => handleInputChange('is_drm_protected', !formData.is_drm_protected)}
            disabled={isSubmitting}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, formData.is_drm_protected && styles.checkboxChecked]}>
              {formData.is_drm_protected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              {t('admin.content.fields.drmProtected', { defaultValue: 'DRM Protected' })}
            </Text>
          </Pressable>
        </View>

        {/* Content Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.content.details', { defaultValue: 'Content Details' })}</Text>

          {/* Duration */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.fields.duration', { defaultValue: 'Duration' })}</Text>
            <TextInput
              style={styles.input}
              placeholder="1:30:00"
              placeholderTextColor={colors.textMuted}
              value={formData.duration || ''}
              onChangeText={(value) => handleInputChange('duration', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Rating */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.fields.rating', { defaultValue: 'Rating' })}</Text>
            <TextInput
              style={styles.input}
              placeholder="PG-13"
              placeholderTextColor={colors.textMuted}
              value={formData.rating || ''}
              onChangeText={(value) => handleInputChange('rating', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Genre */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.fields.genre', { defaultValue: 'Genre' })}</Text>
            <TextInput
              style={styles.input}
              placeholder="Drama"
              placeholderTextColor={colors.textMuted}
              value={formData.genre || ''}
              onChangeText={(value) => handleInputChange('genre', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Director */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.fields.director', { defaultValue: 'Director' })}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('admin.content.fields.directorPlaceholder', { defaultValue: 'Director name' })}
              placeholderTextColor={colors.textMuted}
              value={formData.director || ''}
              onChangeText={(value) => handleInputChange('director', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Is Series Checkbox */}
          <Pressable
            onPress={() => handleInputChange('is_series', !formData.is_series)}
            disabled={isSubmitting}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, formData.is_series && styles.checkboxChecked]}>
              {formData.is_series && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              {t('admin.content.fields.isSeries', { defaultValue: 'This is a series/multi-part content' })}
            </Text>
          </Pressable>

          {/* Series Fields (conditional) */}
          {formData.is_series && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.content.fields.season', { defaultValue: 'Season' })}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={formData.season ? String(formData.season) : ''}
                  onChangeText={(value) => handleInputChange('season', value ? parseInt(value) : undefined)}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.content.fields.episode', { defaultValue: 'Episode' })}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={formData.episode ? String(formData.episode) : ''}
                  onChangeText={(value) => handleInputChange('episode', value ? parseInt(value) : undefined)}
                  editable={!isSubmitting}
                />
              </View>
            </>
          )}
        </View>

        {/* Publishing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.content.publishing', { defaultValue: 'Publishing' })}</Text>

          <Pressable
            onPress={() => handleInputChange('is_published', !formData.is_published)}
            disabled={isSubmitting}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, formData.is_published && styles.checkboxChecked]}>
              {formData.is_published && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              {t('admin.content.fields.isPublished', { defaultValue: 'Publish this content immediately' })}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleInputChange('is_featured', !formData.is_featured)}
            disabled={isSubmitting}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, formData.is_featured && styles.checkboxChecked]}>
              {formData.is_featured && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              {t('admin.content.fields.isFeatured', { defaultValue: 'Feature this content on homepage' })}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleInputChange('is_kids_content', !formData.is_kids_content)}
            disabled={isSubmitting}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, formData.is_kids_content && styles.checkboxChecked]}>
              {formData.is_kids_content && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              {t('admin.content.fields.isKidsContent', { defaultValue: 'This is kids-friendly content' })}
            </Text>
          </Pressable>
        </View>

        {/* Access Control Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.content.accessControl', { defaultValue: 'Access Control' })}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('admin.content.fields.subscription', { defaultValue: 'Required Subscription' })}
            </Text>
            <View style={styles.typeButtons}>
              {(['basic', 'premium', 'family'] as const).map((sub) => (
                <Pressable
                  key={sub}
                  onPress={() => handleInputChange('requires_subscription', sub)}
                  style={[
                    styles.typeButton,
                    formData.requires_subscription === sub && styles.typeButtonActive,
                  ]}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.requires_subscription === sub && styles.typeButtonTextActive,
                    ]}
                  >
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Form Actions */}
        <View style={[styles.formActions, { flexDirection: 'row-reverse' }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          >
            <Save size={18} color={colors.text} />
            <Text style={styles.submitButtonText}>
              {isSubmitting
                ? t('admin.actions.saving', { defaultValue: 'Saving...' })
                : t('admin.actions.save', { defaultValue: 'Save' })}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigate('/admin/content')}
            disabled={isSubmitting}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>
              {t('admin.actions.cancel', { defaultValue: 'Cancel' })}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef444440',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  successContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  successBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#10b98120',
    borderWidth: 1,
    borderColor: '#10b98140',
    alignItems: 'center',
  },
  successText: {
    flex: 1,
    color: '#10b981',
    fontSize: 14,
  },
  formContainer: {
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 14,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  typeButtonTextActive: {
    color: colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
})
