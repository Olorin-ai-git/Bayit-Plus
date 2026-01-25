import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, AlertCircle, Save, CheckCircle } from 'lucide-react'
import { GlassView, GlassButton, GlassPageHeader } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { useContentForm } from '@/hooks/admin/useContentForm'
import BasicInfoSection from '@/components/admin/content/BasicInfoSection'
import MediaSection from '@/components/admin/content/MediaSection'
import StreamingSection from '@/components/admin/content/StreamingSection'
import ContentDetailsSection from '@/components/admin/content/ContentDetailsSection'
import PublishingSection from '@/components/admin/content/PublishingSection'
import AccessControlSection from '@/components/admin/content/AccessControlSection'
import AdminLoadingState from '@/components/admin/shared/AdminLoadingState'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'

export default function ContentEditorPage() {
  const { contentId } = useParams<{ contentId?: string }>()
  const { t } = useTranslation()
  const { isRTL } = useDirection()

  const {
    formData,
    isLoading,
    isSubmitting,
    error,
    success,
    setError,
    handleInputChange,
    handleSubmit,
    handleCancel,
    isEditing,
  } = useContentForm(contentId)

  if (isLoading && error) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <GlassButton
          title={t('admin.actions.back', 'Back to Content')}
          onPress={handleCancel}
          variant="ghost"
          icon={<ArrowLeft size={20} color={colors.primary} />}
        />
        <View style={styles.errorBox}>
          <AlertCircle size={20} color={colors.error.DEFAULT} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </ScrollView>
    )
  }

  if (isLoading) {
    return <AdminLoadingState message={t('common.loading', 'Loading...')} isRTL={isRTL} />
  }

  const pageConfig = ADMIN_PAGE_CONFIG['content-editor']
  const IconComponent = pageConfig.icon

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <GlassPageHeader
        title={
          isEditing
            ? t('admin.content.editor.pageTitle', 'Edit Content')
            : t('admin.content.editor.pageTitleNew', 'Add New Content')
        }
        subtitle={t('admin.contentEditor.subtitle', 'Manage content metadata and streaming details')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        isRTL={isRTL}
        action={
          <GlassButton
            title=""
            onPress={handleCancel}
            variant="ghost"
            icon={<ArrowLeft size={20} />}
          />
        }
      />

      {error && !isLoading && (
        <View style={styles.errorBox}>
          <AlertCircle size={20} color={colors.error.DEFAULT} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {success && (
        <GlassView style={styles.successContainer} intensity="high">
          <CheckCircle size={20} color={colors.success.DEFAULT} />
          <Text style={styles.successText}>
            {isEditing
              ? t('admin.content.updateSuccess', 'Content updated successfully. Redirecting...')
              : t('admin.content.createSuccess', 'Content created successfully. Redirecting...')}
          </Text>
        </GlassView>
      )}

      <View style={styles.formContainer}>
        <BasicInfoSection
          formData={formData}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />

        <MediaSection formData={formData} onChange={handleInputChange} />

        <StreamingSection
          formData={formData}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />

        <ContentDetailsSection
          formData={formData}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />

        <PublishingSection
          formData={formData}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />

        <AccessControlSection
          formData={formData}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />

        <View style={styles.formActions}>
          <GlassButton
            title={t('admin.content.editor.actions.cancel', 'Cancel')}
            onPress={handleCancel}
            variant="ghost"
            disabled={isSubmitting}
            style={styles.button}
          />
          <GlassButton
            title={
              isSubmitting
                ? t('admin.content.editor.actions.saving', 'Saving...')
                : t('admin.content.editor.actions.save', 'Save')
            }
            onPress={handleSubmit}
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            icon={<Save size={18} color={colors.text} />}
            style={styles.button}
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error.DEFAULT + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error.DEFAULT,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: colors.error.DEFAULT,
    fontSize: fontSize.sm,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.success.DEFAULT,
    flex: 1,
  },
  formContainer: {
    gap: spacing.lg,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  button: {
    flex: 1,
  },
})
