import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, AlertCircle, X, Folder } from 'lucide-react'
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
        key: 'thumbnail',
        label: t('admin.content.columns.icon', 'Icon'),
        width: 80,
        align: 'center',
        render: (thumbnail: string | undefined, item: Category) => (
          <View style={styles.thumbnailContainer}>
            {thumbnail ? (
              <Image
                source={{ uri: thumbnail }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Folder size={20} color={colors.textMuted} />
              </View>
            )}
          </View>
        ),
      },
      {
        key: 'name',
        label: t('admin.content.columns.name', 'Name'),
        width: 250,
        align: isRTL ? 'right' : 'left',
        render: (name: string, item: Category) => (
          <View>
            <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
            {item.name_en && <Text style={styles.nameSecondary} numberOfLines={1}>{item.name_en}</Text>}
          </View>
        ),
      },
      {
        key: 'slug',
        label: t('admin.content.columns.slug', 'Slug'),
        width: 150,
        align: isRTL ? 'right' : 'left',
        render: (slug: string) => (
          <Text style={[styles.slugText, { textAlign: isRTL ? 'right' : 'left' }]}>{slug}</Text>
        ),
      },
      {
        key: 'order',
        label: t('admin.content.columns.order', 'Order'),
        width: 80,
        align: isRTL ? 'right' : 'left',
        render: (order: number) => (
          <Text style={[styles.orderText, { textAlign: isRTL ? 'right' : 'left' }]}>{order}</Text>
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
        width: 100,
        align: 'center',
        render: (_: any, item: Category) => (
          <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              variant="ghost"
              size="sm"
              onPress={() => handleEdit(item)}
              icon={<Edit size={18} color="#60a5fa" />}
              style={styles.actionButton}
              accessibilityLabel={t('admin.categories.editCategory', { defaultValue: 'Edit category' })}
            />
            <GlassButton
              variant="ghost"
              size="sm"
              onPress={() => handleDelete(item.id)}
              disabled={deleting === item.id}
              icon={<Trash2 size={18} color="#f87171" />}
              style={[styles.actionButton, deleting === item.id && styles.disabledButton]}
              accessibilityLabel={t('admin.categories.deleteCategory', { defaultValue: 'Delete category' })}
            />
          </View>
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
  thumbnailContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  nameText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  nameSecondary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  slugText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  orderText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  actionsCell: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
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
