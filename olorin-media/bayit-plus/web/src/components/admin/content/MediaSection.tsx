import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView } from '@bayit/shared/ui'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import type { Content } from '@/types/content'

interface MediaSectionProps {
  formData: Partial<Content>
  onChange: (field: string, value: any) => void
}

export default function MediaSection({ formData, onChange }: MediaSectionProps) {
  const { t } = useTranslation()

  return (
    <GlassView style={styles.section} intensity="high">
      <Text style={styles.sectionTitle}>
        {t('admin.content.editor.sections.media', 'Media')}
      </Text>

      <View style={styles.formGroup}>
        <ImageUploader
          value={formData.thumbnail}
          onChange={(url) => onChange('thumbnail', url)}
          label={t('admin.content.editor.fields.thumbnail', 'Thumbnail (3:4 aspect ratio)')}
          aspectRatio={3 / 4}
          allowUrl
        />
      </View>

      <View style={styles.formGroup}>
        <ImageUploader
          value={formData.backdrop}
          onChange={(url) => onChange('backdrop', url)}
          label={t('admin.content.editor.fields.backdrop', 'Backdrop (16:9 aspect ratio)')}
          aspectRatio={16 / 9}
          allowUrl
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
})
