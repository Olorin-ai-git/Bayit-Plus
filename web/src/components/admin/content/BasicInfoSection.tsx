import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView, GlassInput, GlassTextarea } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import type { Content } from '@/types/content'

interface BasicInfoSectionProps {
  formData: Partial<Content>
  onChange: (field: string, value: any) => void
  disabled?: boolean
}

export default function BasicInfoSection({ formData, onChange, disabled }: BasicInfoSectionProps) {
  const { t } = useTranslation()

  return (
    <GlassView style={styles.section} intensity="high">
      <Text style={styles.sectionTitle}>
        {t('admin.content.editor.sections.basicInfo', 'Basic Information')}
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('admin.content.editor.fields.title', 'Title')}
          <Text style={styles.required}>*</Text>
        </Text>
        <GlassInput
          placeholder={t('admin.content.editor.fields.titlePlaceholder', 'Content title')}
          value={formData.title || ''}
          onChangeText={(value) => onChange('title', value)}
          editable={!disabled}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('admin.content.editor.fields.year', 'Year')}</Text>
        <GlassInput
          placeholder={t('admin.content.editor.fields.yearPlaceholder', '2024')}
          keyboardType="numeric"
          value={formData.year ? String(formData.year) : ''}
          onChangeText={(value) => onChange('year', value ? parseInt(value) : undefined)}
          editable={!disabled}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('admin.content.editor.fields.description', 'Description')}</Text>
        <GlassTextarea
          placeholder={t('admin.content.editor.fields.descriptionPlaceholder', 'Content description')}
          value={formData.description || ''}
          onChangeText={(value) => onChange('description', value)}
          editable={!disabled}
        />
      </View>
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
  formGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error.DEFAULT,
    marginLeft: spacing.xs,
  },
})
