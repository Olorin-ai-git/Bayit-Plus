import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassInput, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import type { Category } from '@/types/content'

interface EditingCategory extends Partial<Category> {
  id?: string
}

interface CategoryEditFormProps {
  editingId: string | null
  editData: EditingCategory
  onSave: () => void
  onCancel: () => void
  onChange: (updates: Partial<EditingCategory>) => void
  isRTL: boolean
}

export default function CategoryEditForm({
  editingId,
  editData,
  onSave,
  onCancel,
  onChange,
  isRTL,
}: CategoryEditFormProps) {
  const { t } = useTranslation()

  if (!editingId) return null

  const isNew = editingId === 'new'

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
        {isNew
          ? t('admin.categories.form.titleNew', 'New Category')
          : t('admin.categories.form.titleEdit', 'Edit Category')}
      </Text>

      <GlassInput
        label={t('admin.categories.form.nameHebrew', 'Category name (Hebrew)')}
        containerStyle={styles.input}
        placeholder={t('admin.categories.form.nameHebrewPlaceholder', 'Category name (Hebrew)')}
        value={editData.name || ''}
        onChangeText={(value) => onChange({ name: value })}
      />

      <GlassInput
        label={t('admin.categories.form.nameEnglish', 'Category name (English)')}
        containerStyle={styles.input}
        placeholder={t('admin.categories.form.nameEnglishPlaceholder', 'Category name (English)')}
        value={editData.name_en || ''}
        onChangeText={(value) => onChange({ name_en: value })}
      />

      <GlassInput
        label={t('admin.categories.form.slug', 'Slug')}
        containerStyle={styles.input}
        placeholder={t('admin.categories.form.slugPlaceholder', 'Slug (e.g., movies)')}
        value={editData.slug || ''}
        onChangeText={(value) => onChange({ slug: value })}
      />

      <View style={styles.actions}>
        <GlassButton
          title={t('common.cancel', 'Cancel')}
          onPress={onCancel}
          variant="ghost"
          style={styles.button}
        />
        <GlassButton
          title={t('common.save', 'Save')}
          onPress={onSave}
          variant="primary"
          style={styles.button}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.glass.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
  },
})
