import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react'
import { contentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassTable, GlassTableCell, GlassTableColumn } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import logger from '@/utils/logger'
import type { Category, PaginatedResponse } from '@/types/content'

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface EditingCategory extends Partial<Category> {
  id?: string
}

export default function CategoriesPage() {
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const { showConfirm } = useModal()
  const [items, setItems] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingCategory>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response: PaginatedResponse<Category> = await contentService.getCategories({
        page: pagination.page,
        page_size: pagination.pageSize,
      })
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load categories'
      logger.error(msg, 'CategoriesPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleEdit = (item: Category) => {
    setEditingId(item.id)
    setEditData(item)
  }

  const handleSaveEdit = async () => {
    if (!editData.name) {
      setError(t('admin.content.validation.nameRequired', { defaultValue: 'Name is required' }))
      return
    }
    try {
      await contentService.updateCategory(editingId!, editData)
      setEditingId(null)
      setEditData({})
      await loadCategories()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update category'
      logger.error(msg, 'CategoriesPage', err)
      setError(msg)
    }
  }

  const handleDelete = (id: string) => {
    showConfirm(
      t('admin.content.confirmDelete'),
      async () => {
        try {
          setDeleting(id)
          await contentService.deleteCategory(id)
          setItems(items.filter((item) => item.id !== id))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to delete category'
          logger.error(msg, 'CategoriesPage', err)
          setError(msg)
        } finally {
          setDeleting(null)
        }
      },
      { destructive: true, confirmText: t('common.delete', 'Delete') }
    )
  }

  const columns: GlassTableColumn<Category>[] = [
    {
      key: 'name',
      label: t('admin.content.columns.name', { defaultValue: 'Name' }),
      align: isRTL ? 'right' : 'left',
      render: (name: string, item: Category) => (
        <GlassTableCell.TwoLine
          primary={name}
          secondary={item.name_en}
          align={isRTL ? 'right' : 'left'}
        />
      ),
    },
    {
      key: 'slug',
      label: t('admin.content.columns.slug', { defaultValue: 'Slug' }),
      width: 150,
      align: isRTL ? 'right' : 'left',
      render: (slug: string) => (
        <Text style={[styles.cellText, { textAlign: isRTL ? 'right' : 'left' }]}>{slug}</Text>
      ),
    },
    {
      key: 'order',
      label: t('admin.content.columns.order', { defaultValue: 'Order' }),
      width: 80,
      align: isRTL ? 'right' : 'left',
      render: (order: number) => (
        <Text style={[styles.cellText, { textAlign: isRTL ? 'right' : 'left' }]}>{order}</Text>
      ),
    },
    {
      key: 'is_active',
      label: t('admin.content.columns.status', { defaultValue: 'Status' }),
      width: 100,
      align: isRTL ? 'right' : 'left',
      render: (isActive: boolean) => (
        <GlassTableCell.Badge variant={isActive ? 'success' : 'default'}>
          {isActive ? t('admin.categories.status.active', { defaultValue: 'Active' }) : t('admin.categories.status.inactive', { defaultValue: 'Inactive' })}
        </GlassTableCell.Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 90,
      align: 'center',
      render: (_: any, item: Category) => (
        <GlassTableCell.Actions isRTL={isRTL}>
          <GlassTableCell.ActionButton
            onPress={() => handleEdit(item)}
            icon={<Edit size={16} color="#3b82f6" />}
            variant="primary"
          />
          <GlassTableCell.ActionButton
            onPress={() => handleDelete(item.id)}
            icon={<Trash2 size={16} color="#ef4444" />}
            variant="danger"
            disabled={deleting === item.id}
          />
        </GlassTableCell.Actions>
      ),
    },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.categories', { defaultValue: 'Categories' })}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.categories.subtitle', { defaultValue: 'Manage content categories' })}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setEditingId('new')
            setEditData({ is_active: true, order: items.length + 1 })
          }}
          style={styles.addButton}
        >
          <Plus size={18} color={colors.text} />
          <Text style={styles.addButtonText}>{t('admin.actions.new', { defaultValue: 'New' })}</Text>
        </Pressable>
      </View>

      {error && (
        <View style={[styles.errorContainer, { marginBottom: spacing.lg }]}>
          <AlertCircle size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <X size={18} color="#ef4444" />
          </Pressable>
        </View>
      )}

      {editingId && (
        <View style={styles.editForm}>
          <Text style={styles.formTitle}>
            {editingId === 'new' ? 'New Category' : 'Edit Category'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Category name (Hebrew)"
            placeholderTextColor={colors.textMuted}
            value={editData.name || ''}
            onChangeText={(value) => setEditData({ ...editData, name: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Category name (English)"
            placeholderTextColor={colors.textMuted}
            value={editData.name_en || ''}
            onChangeText={(value) => setEditData({ ...editData, name_en: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Slug (e.g., movies)"
            placeholderTextColor={colors.textMuted}
            value={editData.slug || ''}
            onChangeText={(value) => setEditData({ ...editData, slug: value })}
          />
          <View style={styles.formActions}>
            <Pressable onPress={() => setEditingId(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('admin.common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{t('admin.common.save')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <GlassTable
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={t('admin.categories.emptyMessage', { defaultValue: 'No categories found' })}
        isRTL={isRTL}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  addButtonText: { color: colors.text, fontWeight: '500', fontSize: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: '#ef444420', borderColor: '#ef444440', borderWidth: 1, borderRadius: borderRadius.md },
  errorText: { flex: 1, color: '#ef4444', fontSize: 14 },
  cellText: { fontSize: 14, color: colors.text },
  editForm: { backgroundColor: colors.backgroundLighter, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  formTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  input: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 14, marginBottom: spacing.md },
  formActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: colors.text, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: colors.text, fontWeight: '600' },
})
