import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react'
import { adminContentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassInput, GlassPageHeader } from '@bayit/shared/ui'
import { GlassTable, GlassTableCell, type GlassTableColumn } from '@bayit/shared/ui/web'
import { useDirection } from '@/hooks/useDirection'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
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
  const notifications = useNotifications()
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
      const response: PaginatedResponse<Category> = await adminContentService.getCategories({
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
      await adminContentService.updateCategory(editingId!, editData)
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
    notifications.show({
      level: 'warning',
      title: t('common.confirm', 'Confirm'),
      message: t('admin.content.confirmDelete'),
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action' as const,
        onPress: async () => {
          try {
            setDeleting(id)
            await adminContentService.deleteCategory(id)
            setItems(items.filter((item) => item.id !== id))
            notifications.showSuccess(t('admin.content.deleteSuccess', 'Category deleted'), 'Success')
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete category'
            logger.error(msg, 'CategoriesPage', err)
            setError(msg)
            notifications.showError(msg, 'Error')
          } finally {
            setDeleting(null)
          }
        },
      },
      dismissable: true,
    })
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
            icon={<Edit size={16} color="#a855f7" />}
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

  const pageConfig = ADMIN_PAGE_CONFIG.categories;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.titles.categories', { defaultValue: 'Categories' })}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={items.length}
        isRTL={isRTL}
      />

      <View style={[styles.actionsRow, { flexDirection }]}>
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
          <GlassInput
            label={t('admin.categories.form.nameHebrew', 'Category name (Hebrew)')}
            containerStyle={styles.input}
            placeholder="Category name (Hebrew)"
            value={editData.name || ''}
            onChangeText={(value) => setEditData({ ...editData, name: value })}
          />
          <GlassInput
            label={t('admin.categories.form.nameEnglish', 'Category name (English)')}
            containerStyle={styles.input}
            placeholder="Category name (English)"
            value={editData.name_en || ''}
            onChangeText={(value) => setEditData({ ...editData, name_en: value })}
          />
          <GlassInput
            label={t('admin.categories.form.slug', 'Slug')}
            containerStyle={styles.input}
            placeholder="Slug (e.g., movies)"
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
  container: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  addButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    flex: 1,
    color: colors.error.DEFAULT,
    fontSize: 14,
  },
  editForm: {
    padding: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: 0,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  cellText: {
    fontSize: 14,
    color: colors.text,
  },
});
