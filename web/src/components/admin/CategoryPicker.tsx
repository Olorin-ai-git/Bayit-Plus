import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Plus, Search, AlertCircle } from 'lucide-react'
import { GlassView, GlassInput, GlassButton, GlassModal } from '@bayit/shared/ui'
import { colors } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'
import type { Category } from '../../types/content'

interface CategoryPickerProps {
  value?: string
  onChange: (categoryId: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  onError?: (error: string | null) => void
  allowCreate?: boolean
}

export function CategoryPicker({
  value,
  onChange,
  label,
  placeholder,
  required = false,
  onError,
  allowCreate = true,
}: CategoryPickerProps) {
  const { t } = useTranslation()
  const { isRTL, textAlign } = useDirection()
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { contentService } = await import('../../services/adminApi')
      const response = await contentService.getCategories({ page_size: 100 })
      setCategories(response.items || [])
    } catch (err) {
      const msg = t('admin.content.categoryPicker.errors.loadFailed')
      setError(msg)
      onError?.(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === value)

  const filteredCategories = search
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.name_en?.toLowerCase().includes(search.toLowerCase()))
    : categories

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setIsCreating(true)
    try {
      const { contentService } = await import('../../services/adminApi')
      const newCategory = await contentService.createCategory({
        name: newCategoryName,
        slug: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        is_active: true,
      })
      setCategories([...categories, newCategory])
      onChange(newCategory.id)
      setNewCategoryName('')
      setShowCreateModal(false)
      setError(null)
    } catch (err) {
      const msg = t('admin.content.categoryPicker.errors.createFailed')
      setError(msg)
      onError?.(msg)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { textAlign }]}>{label}</Text>}

      <Pressable onPress={() => setIsOpen(!isOpen)} disabled={isLoading}>
        <GlassView
          style={[
            styles.selectButton,
            error && styles.selectButtonError,
          ]}
          intensity="medium"
          borderColor={error ? colors.error : undefined}
        >
          <Text style={[
            selectedCategory ? styles.selectedText : styles.placeholderText,
            { textAlign }
          ]}>
            {selectedCategory ? selectedCategory.name : (placeholder || t('admin.content.categoryPicker.selectPlaceholder'))}
          </Text>
          <ChevronDown
            size={16}
            color={colors.textMuted}
            style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
          />
        </GlassView>
      </Pressable>

      {isOpen && (
        <GlassView style={styles.dropdown} intensity="high">
          <View style={styles.searchContainer}>
            <GlassInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('admin.content.categoryPicker.searchPlaceholder')}
              icon={<Search size={16} color={colors.textMuted} />}
              autoFocus
            />
          </View>

          {isLoading ? (
            <View style={styles.message}>
              <Text style={styles.messageText}>{t('admin.content.categoryPicker.loading')}</Text>
            </View>
          ) : error ? (
            <View style={styles.errorMessage}>
              <AlertCircle size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : filteredCategories.length === 0 ? (
            <View style={styles.message}>
              <Text style={styles.messageText}>
                {search ? t('admin.content.categoryPicker.noResults') : t('admin.content.categoryPicker.noCategories')}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.categoryList}>
              {filteredCategories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => {
                    onChange(category.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  style={styles.categoryItem}
                >
                  <GlassView
                    style={[
                      styles.categoryButton,
                      value === category.id && styles.categoryButtonSelected,
                    ]}
                    intensity={value === category.id ? 'high' : 'low'}
                  >
                    <View>
                      <Text style={[styles.categoryName, { textAlign }]}>{category.name}</Text>
                      {category.name_en && (
                        <Text style={[styles.categoryNameEn, { textAlign }]}>{category.name_en}</Text>
                      )}
                    </View>
                    {value === category.id && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </GlassView>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {allowCreate && (
            <Pressable
              onPress={() => {
                setShowCreateModal(true)
                setIsOpen(false)
                setSearch('')
              }}
              style={styles.createButton}
            >
              <GlassView style={styles.createButtonInner} intensity="medium">
                <Plus size={16} color={colors.primary} />
                <Text style={styles.createButtonText}>
                  {t('admin.content.categoryPicker.createNew')}
                </Text>
              </GlassView>
            </Pressable>
          )}
        </GlassView>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={14} color={colors.error} />
          <Text style={styles.errorTextSmall}>{error}</Text>
        </View>
      )}

      {/* Create Category Modal */}
      <GlassModal
        visible={showCreateModal}
        type="info"
        title={t('admin.content.categoryPicker.modal.title')}
        onClose={() => {
          setShowCreateModal(false)
          setNewCategoryName('')
        }}
        dismissable={!isCreating}
        buttons={[
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => {
              setShowCreateModal(false)
              setNewCategoryName('')
            },
          },
          {
            text: isCreating ? t('admin.content.categoryPicker.modal.creating') : t('admin.content.categoryPicker.modal.create'),
            style: 'default',
            onPress: handleCreateCategory,
          },
        ]}
      >
        <GlassInput
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          placeholder={t('admin.content.categoryPicker.modal.placeholder')}
          autoFocus
          editable={!isCreating}
        />
      </GlassModal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  selectButtonError: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  selectedText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  placeholderText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  dropdown: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    maxHeight: 400,
    overflow: 'hidden',
  },
  searchContainer: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  message: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
  },
  categoryList: {
    maxHeight: 240,
  },
  categoryItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  categoryButtonSelected: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  categoryNameEn: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  createButton: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  createButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  errorTextSmall: {
    fontSize: 12,
    color: colors.error,
  },
})
