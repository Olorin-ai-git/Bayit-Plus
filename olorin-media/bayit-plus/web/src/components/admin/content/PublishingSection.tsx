import { Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView, GlassCheckbox } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import type { Content } from '@/types/content'

interface PublishingSectionProps {
  formData: Partial<Content>
  onChange: (field: string, value: any) => void
  disabled?: boolean
}

export default function PublishingSection({ formData, onChange, disabled }: PublishingSectionProps) {
  const { t } = useTranslation()

  return (
    <GlassView style={styles.section} intensity="high">
      <Text style={styles.sectionTitle}>
        {t('admin.content.editor.sections.publishing', 'Publishing')}
      </Text>

      <GlassCheckbox
        checked={formData.is_published || false}
        onChange={(checked) => onChange('is_published', checked)}
        label={t('admin.content.editor.fields.isPublishedLabel', 'Publish this content immediately')}
        disabled={disabled}
      />

      <GlassCheckbox
        checked={formData.is_featured || false}
        onChange={(checked) => onChange('is_featured', checked)}
        label={t('admin.content.editor.fields.isFeaturedLabel', 'Feature this content on homepage')}
        disabled={disabled}
      />

      <GlassCheckbox
        checked={formData.is_kids_content || false}
        onChange={(checked) => onChange('is_kids_content', checked)}
        label={t('admin.content.editor.fields.isKidsContentLabel', 'This is kids-friendly content')}
        disabled={disabled}
      />
    </GlassView>
  )
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
})
