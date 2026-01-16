import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, AlertCircle, Save, CheckCircle } from 'lucide-react'
import { GlassView, GlassInput, GlassButton, GlassCheckbox, GlassTextarea } from '@bayit/shared/ui'
import { adminContentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'
import logger from '@/utils/logger'
import { ImageUploader } from '@/components/admin/ImageUploader'
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
        await adminContentService.updateContent(contentId, formData)
      } else {
        await adminContentService.createContent(formData as Content)
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
        <GlassButton
          title={t('admin.actions.back', { defaultValue: 'Back to Content' })}
          onPress={() => navigate('/admin/content')}
          variant="ghost"
          icon={<ArrowLeft size={20} color={colors.primary} />}
        />
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
        <GlassButton
          title=""
          onPress={() => navigate('/admin/content')}
          variant="ghost"
          icon={<ArrowLeft size={20} color={colors.primary} />}
          style={styles.backButton}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { textAlign }]}>
            {isEditing
              ? t('admin.content.editor.pageTitle', { defaultValue: 'Edit Content' })
              : t('admin.content.editor.pageTitleNew', { defaultValue: 'Add New Content' })}
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
        <GlassView style={styles.successContainer} intensity="medium">
          <CheckCircle size={20} color={colors.success} />
          <Text style={styles.successText}>
            {isEditing
              ? t('admin.content.updateSuccess', { defaultValue: 'Content updated successfully. Redirecting...' })
              : t('admin.content.createSuccess', { defaultValue: 'Content created successfully. Redirecting...' })}
          </Text>
        </GlassView>
      )}

      {/* Form Container */}
      <View style={styles.formContainer}>
        {/* Basic Information Section */}
        <GlassView style={styles.section} intensity="medium">
          <Text style={styles.sectionTitle}>{t('admin.content.editor.sections.basicInfo', { defaultValue: 'Basic Information' })}</Text>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('admin.content.editor.fields.title', { defaultValue: 'Title' })}
              <Text style={styles.required}>*</Text>
            </Text>
            <GlassInput
              placeholder={t('admin.content.editor.fields.titlePlaceholder', { defaultValue: 'Content title' })}
              value={formData.title || ''}
              onChangeText={(value) => handleInputChange('title', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Year */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.year', { defaultValue: 'Year' })}</Text>
            <GlassInput
              placeholder={t('admin.content.editor.fields.yearPlaceholder', { defaultValue: '2024' })}
              keyboardType="numeric"
              value={formData.year ? String(formData.year) : ''}
              onChangeText={(value) => handleInputChange('year', value ? parseInt(value) : undefined)}
              editable={!isSubmitting}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.description', { defaultValue: 'Description' })}</Text>
            <GlassTextarea
              placeholder={t('admin.content.editor.fields.descriptionPlaceholder', { defaultValue: 'Content description' })}
              value={formData.description || ''}
              onChangeText={(value) => handleInputChange('description', value)}
              editable={!isSubmitting}
            />
          </View>
        </GlassView>

        {/* Media Section */}
        <GlassView style={styles.section} intensity="medium">
          <Text style={styles.sectionTitle}>{t('admin.content.editor.sections.media', { defaultValue: 'Media' })}</Text>

          {/* Thumbnail */}
          <View style={styles.formGroup}>
            <ImageUploader
              value={formData.thumbnail}
              onChange={(url) => handleInputChange('thumbnail', url)}
              label={t('admin.content.editor.fields.thumbnail', { defaultValue: 'Thumbnail (3:4 aspect ratio)' })}
              aspectRatio={3 / 4}
              allowUrl
            />
          </View>

          {/* Backdrop */}
          <View style={styles.formGroup}>
            <ImageUploader
              value={formData.backdrop}
              onChange={(url) => handleInputChange('backdrop', url)}
              label={t('admin.content.editor.fields.backdrop', { defaultValue: 'Backdrop (16:9 aspect ratio)' })}
              aspectRatio={16 / 9}
              allowUrl
            />
          </View>
        </GlassView>

        {/* Streaming Section */}
        <GlassView style={styles.section} intensity="medium">
          <Text style={styles.sectionTitle}>{t('admin.content.editor.sections.streaming', { defaultValue: 'Streaming' })}</Text>

          {/* Stream URL */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('admin.content.editor.fields.streamUrl', { defaultValue: 'Stream URL' })}
              <Text style={styles.required}>*</Text>
            </Text>
            <GlassInput
              placeholder="https://example.com/stream.m3u8"
              value={formData.stream_url || ''}
              onChangeText={(value) => handleInputChange('stream_url', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Stream Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.streamType', { defaultValue: 'Stream Type' })}</Text>
            <View style={styles.typeButtons}>
              {(['hls', 'dash'] as const).map((type) => (
                <GlassButton
                  key={type}
                  title={type.toUpperCase()}
                  onPress={() => handleInputChange('stream_type', type)}
                  variant={formData.stream_type === type ? 'primary' : 'outline'}
                  disabled={isSubmitting}
                  style={styles.typeButton}
                />
              ))}
            </View>
          </View>

          {/* DRM Protected */}
          <GlassCheckbox
            checked={formData.is_drm_protected || false}
            onChange={(checked) => handleInputChange('is_drm_protected', checked)}
            label={t('admin.content.editor.fields.drmProtectedLabel', { defaultValue: 'This content requires DRM protection' })}
            disabled={isSubmitting}
          />
        </GlassView>

        {/* Content Details Section */}
        <GlassView style={styles.section} intensity="medium">
          <Text style={styles.sectionTitle}>{t('admin.content.editor.sections.details', { defaultValue: 'Content Details' })}</Text>

          {/* Duration */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.duration', { defaultValue: 'Duration' })}</Text>
            <GlassInput
              placeholder={t('admin.content.editor.fields.durationPlaceholder', { defaultValue: '1:30:00' })}
              value={formData.duration || ''}
              onChangeText={(value) => handleInputChange('duration', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Rating */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.rating', { defaultValue: 'Rating' })}</Text>
            <GlassInput
              placeholder={t('admin.content.editor.fields.ratingPlaceholder', { defaultValue: 'PG-13' })}
              value={formData.rating || ''}
              onChangeText={(value) => handleInputChange('rating', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Genre */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.genre', { defaultValue: 'Genre' })}</Text>
            <GlassInput
              placeholder={t('admin.content.editor.fields.genrePlaceholder', { defaultValue: 'Drama' })}
              value={formData.genre || ''}
              onChangeText={(value) => handleInputChange('genre', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Director */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.director', { defaultValue: 'Director' })}</Text>
            <GlassInput
              placeholder={t('admin.content.editor.fields.directorPlaceholder', { defaultValue: 'Director name' })}
              value={formData.director || ''}
              onChangeText={(value) => handleInputChange('director', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Is Series Checkbox */}
          <GlassCheckbox
            checked={formData.is_series || false}
            onChange={(checked) => handleInputChange('is_series', checked)}
            label={t('admin.content.editor.fields.isSeriesLabel', { defaultValue: 'This is a series/multi-part content' })}
            disabled={isSubmitting}
          />

          {/* Series Fields (conditional) */}
          {formData.is_series && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.content.editor.fields.season', { defaultValue: 'Season' })}</Text>
                <GlassInput
                  placeholder="1"
                  keyboardType="numeric"
                  value={formData.season ? String(formData.season) : ''}
                  onChangeText={(value) => handleInputChange('season', value ? parseInt(value) : undefined)}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.content.editor.fields.episode', { defaultValue: 'Episode' })}</Text>
                <GlassInput
                  placeholder="1"
                  keyboardType="numeric"
                  value={formData.episode ? String(formData.episode) : ''}
                  onChangeText={(value) => handleInputChange('episode', value ? parseInt(value) : undefined)}
                  editable={!isSubmitting}
                />
              </View>
            </>
          )}
        </GlassView>

        {/* Publishing Section */}
        <GlassView style={styles.section} intensity="medium">
          <Text style={styles.sectionTitle}>{t('admin.content.editor.sections.publishing', { defaultValue: 'Publishing' })}</Text>

          <GlassCheckbox
            checked={formData.is_published || false}
            onChange={(checked) => handleInputChange('is_published', checked)}
            label={t('admin.content.editor.fields.isPublishedLabel', { defaultValue: 'Publish this content immediately' })}
            disabled={isSubmitting}
          />

          <GlassCheckbox
            checked={formData.is_featured || false}
            onChange={(checked) => handleInputChange('is_featured', checked)}
            label={t('admin.content.editor.fields.isFeaturedLabel', { defaultValue: 'Feature this content on homepage' })}
            disabled={isSubmitting}
          />

          <GlassCheckbox
            checked={formData.is_kids_content || false}
            onChange={(checked) => handleInputChange('is_kids_content', checked)}
            label={t('admin.content.editor.fields.isKidsContentLabel', { defaultValue: 'This is kids-friendly content' })}
            disabled={isSubmitting}
          />
        </GlassView>

        {/* Access Control Section */}
        <GlassView style={styles.section} intensity="medium">
          <Text style={styles.sectionTitle}>{t('admin.content.editor.sections.accessControl', { defaultValue: 'Access Control' })}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('admin.content.editor.fields.requiredSubscription', { defaultValue: 'Required Subscription' })}
            </Text>
            <View style={styles.typeButtons}>
              {(['basic', 'premium', 'family'] as const).map((sub) => (
                <GlassButton
                  key={sub}
                  title={t(`admin.content.editor.subscriptionTiers.${sub}`, { defaultValue: sub.charAt(0).toUpperCase() + sub.slice(1) })}
                  onPress={() => handleInputChange('requires_subscription', sub)}
                  variant={formData.requires_subscription === sub ? 'primary' : 'outline'}
                  disabled={isSubmitting}
                  style={styles.typeButton}
                />
              ))}
            </View>
          </View>
        </GlassView>

        {/* Form Actions */}
        <View style={[styles.formActions, { flexDirection: 'row-reverse' }]}>
          <GlassButton
            title={isSubmitting
              ? t('admin.content.editor.actions.saving', { defaultValue: 'Saving...' })
              : t('admin.content.editor.actions.save', { defaultValue: 'Save' })}
            onPress={handleSubmit}
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            icon={<Save size={18} color={colors.text} />}
            style={{ flex: 1 }}
          />

          <GlassButton
            title={t('admin.content.editor.actions.cancel', { defaultValue: 'Cancel' })}
            onPress={() => navigate('/admin/content')}
            variant="ghost"
            disabled={isSubmitting}
            style={{ flex: 1 }}
          />
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
    marginTop: spacing.xs,
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
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  successText: {
    flex: 1,
    color: colors.success,
    fontSize: 14,
    fontWeight: '500',
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
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
})
