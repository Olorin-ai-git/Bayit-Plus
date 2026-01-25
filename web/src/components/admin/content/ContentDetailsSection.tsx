import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView, GlassInput, GlassCheckbox } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import type { Content } from '@/types/content'

interface ContentDetailsSectionProps {
  formData: Partial<Content>
  onChange: (field: string, value: any) => void
  disabled?: boolean
}

export default function ContentDetailsSection({
  formData,
  onChange,
  disabled,
}: ContentDetailsSectionProps) {
  const { t } = useTranslation()

  return (
    <GlassView style={styles.section} intensity="high">
      <Text style={styles.sectionTitle}>
        {t('admin.content.editor.sections.details', 'Content Details')}
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('admin.content.editor.fields.duration', 'Duration')}</Text>
        <GlassInput
          placeholder={t('admin.content.editor.fields.durationPlaceholder', '1:30:00')}
          value={formData.duration || ''}
          onChangeText={(value) => onChange('duration', value)}
          editable={!disabled}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('admin.content.editor.fields.rating', 'Rating')}</Text>
        <GlassInput
          placeholder={t('admin.content.editor.fields.ratingPlaceholder', 'PG-13')}
          value={formData.rating || ''}
          onChangeText={(value) => onChange('rating', value)}
          editable={!disabled}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('admin.content.editor.fields.genre', 'Genre')}</Text>
        <GlassInput
          placeholder={t('admin.content.editor.fields.genrePlaceholder', 'Drama')}
          value={formData.genre || ''}
          onChangeText={(value) => onChange('genre', value)}
          editable={!disabled}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('admin.content.editor.fields.director', 'Director')}</Text>
        <GlassInput
          placeholder={t('admin.content.editor.fields.directorPlaceholder', 'Director name')}
          value={formData.director || ''}
          onChangeText={(value) => onChange('director', value)}
          editable={!disabled}
        />
      </View>

      <GlassCheckbox
        checked={formData.is_series || false}
        onChange={(checked) => onChange('is_series', checked)}
        label={t('admin.content.editor.fields.isSeriesLabel', 'This is a series/multi-part content')}
        disabled={disabled}
      />

      {formData.is_series && (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.season', 'Season')}</Text>
            <GlassInput
              placeholder="1"
              keyboardType="numeric"
              value={formData.season ? String(formData.season) : ''}
              onChangeText={(value) => onChange('season', value ? parseInt(value) : undefined)}
              editable={!disabled}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.content.editor.fields.episode', 'Episode')}</Text>
            <GlassInput
              placeholder="1"
              keyboardType="numeric"
              value={formData.episode ? String(formData.episode) : ''}
              onChangeText={(value) => onChange('episode', value ? parseInt(value) : undefined)}
              editable={!disabled}
            />
          </View>
        </>
      )}
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
})
