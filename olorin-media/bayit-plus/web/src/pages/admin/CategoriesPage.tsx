import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, AlertCircle, X } from 'lucide-react'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { GlassPageHeader, GlassButton } from '@bayit/shared/ui'
import { GlassTable, GlassTableCell, type GlassTableColumn } from '@bayit/shared/ui/web'
import { useDirection } from '@/hooks/useDirection'
import { useCategoriesData } from '@/hooks/admin/useCategoriesData'
import CategoryEditForm from '@/components/admin/categories/CategoryEditForm'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import type { Category } from '@/types/content'

export default function CategoriesPage() {
  const { t } = useTranslation()
  const { isRTL, flexDirection } = useDirection()

  const {
    items,
    isLoading,
    error,
    pagination,
    editingId,
    editData,
    deleting,
    setError,
    handleNew,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleDelete,
    handlePageChange,
    handleEditDataChange,
  } = useCategoriesData()

  const columns: GlassTableColumn<Category>[] = useMemo(
    () => [
      {
        key: 'name',
        label: t('admin.content.columns.name', 'Name'),
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
        label: t('admin.content.columns.slug', 'Slug'),
        width: 150,
        align: isRTL ? 'right' : 'left',
        render: (slug: string) => (
          <Text style={[styles.cellText, { textAlign: isRTL ? 'right' : 'left' }]}>{slug}</Text>
        ),
      },
      {
        key: 'order',
        label: t('admin.content.columns.order', 'Order'),
        width: 80,
        align: isRTL ? 'right' : 'left',
        render: (order: number) => (
          <Text style={[styles.cellText, { textAlign: isRTL ? 'right' : 'left' }]}>{order}</Text>
        ),
      },
      {
        key: 'is_active',
        label: t('admin.content.columns.status', 'Status'),
        width: 100,
        align: isRTL ? 'right' : 'left',
        render: (isActive: boolean) => (
          <GlassTableCell.Badge variant={isActive ? 'success' : 'default'}>
            {isActive
              ? t('admin.categories.status.active', 'Active')
              : t('admin.categories.status.inactive', 'Inactive')}
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
              icon={<Edit size={16} color={colors.info.DEFAULT} />}
              variant="primary"
            />
            <GlassTableCell.ActionButton
              onPress={() => handleDelete(item.id)}
              icon={<Trash2 size={16} color={colors.error.DEFAULT} />}
              variant="danger"
              disabled={deleting === item.id}
            />
          </GlassTableCell.Actions>
        ),
      },
    ],
    [t, isRTL, handleEdit, handleDelete, deleting]
  )

  const pageConfig = ADMIN_PAGE_CONFIG.categories
  const IconComponent = pageConfig.icon

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <GlassPageHeader
        title={t('admin.titles.categories', 'Categories')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={items.length}
        isRTL={isRTL}
      />

      <View style={[styles.actionsRow, { flexDirection }]}>
        <GlassButton
          title={t('admin.actions.new', 'New')}
          onPress={handleNew}
          variant="primary"
          icon={<Plus size={18} />}
        />
      </View>

      {error && (
        <View style={[styles.errorContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AlertCircle size={18} color={colors.error.DEFAULT} />
          <Text style={styles.errorText}>{error}</Text>
          <GlassButton
            title=""
            onPress={() => setError(null)}
            variant="ghost"
            icon={<X size={18} />}
            style={styles.dismissButton}
          />
        </View>
      )}

      <CategoryEditForm
        editingId={editingId}
        editData={editData}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        onChange={handleEditDataChange}
        isRTL={isRTL}
      />

      <GlassTable
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage={t('admin.categories.emptyMessage', 'No categories found')}
        isRTL={isRTL}
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.error.DEFAULT + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error.DEFAULT + '30',
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: colors.error.DEFAULT,
    fontSize: fontSize.sm,
  },
  dismissButton: {
    minWidth: 36,
    minHeight: 36,
  },
  cellText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
})
