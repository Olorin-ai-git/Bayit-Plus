import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { contentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'
import logger from '@/utils/logger'
import { ContentEditorForm } from '@/components/admin/ContentEditorForm'
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
  const [contentData, setContentData] = useState<Partial<Content> | undefined>(undefined)

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
      setContentData(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load content'
      logger.error(msg, 'ContentEditorPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (formData: Partial<Content>) => {
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

  const handleCancel = () => {
    navigate('/admin/content')
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
      <ContentEditorForm
        type="vod"
        initialData={contentData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
      />
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
})
