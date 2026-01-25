import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Star, AlertCircle, RefreshCw, Save } from 'lucide-react'
import { GlassReorderableList, GlassButton, GlassPageHeader } from '@bayit/shared/ui'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import { useDirection } from '@/hooks/useDirection'
import { useFeaturedData } from '@/hooks/admin/useFeaturedData'
import FeaturedItemCard from '@/components/admin/featured/FeaturedItemCard'
import FeaturedFilters from '@/components/admin/featured/FeaturedFilters'
import AdminLoadingState from '@/components/admin/shared/AdminLoadingState'
import AdminEmptyState from '@/components/admin/shared/AdminEmptyState'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

export default function FeaturedManagementPage() {
  const { t } = useTranslation()
  const { isRTL } = useDirection()

  const {
    filteredItems,
    isLoading,
    isSaving,
    error,
    filterType,
    hasChanges,
    setFilterType,
    setError,
    handleReorder,
    handleSaveOrder,
    handleRemoveFromFeatured,
    refresh,
  } = useFeaturedData()

  const pageConfig = ADMIN_PAGE_CONFIG.featured
  const IconComponent = pageConfig.icon

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Page Header */}
        <GlassPageHeader
          title={t('admin.featured.title')}
          subtitle={t('admin.featured.subtitle')}
          icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
          iconColor={pageConfig.iconColor}
          iconBackgroundColor={pageConfig.iconBackgroundColor}
          badge={filteredItems.length}
          isRTL={isRTL}
          action={
            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassButton
                title=""
                onPress={refresh}
                variant="ghost"
                icon={<RefreshCw size={20} />}
                disabled={isLoading}
              />
              {hasChanges && (
                <GlassButton
                  title={t('common.save')}
                  onPress={handleSaveOrder}
                  variant="primary"
                  icon={<Save size={18} />}
                  loading={isSaving}
                />
              )}
            </View>
          }
        />

        {/* Unsaved Changes Warning */}
        {hasChanges && (
          <View style={styles.warningBanner}>
            <AlertCircle size={18} color={colors.warning.DEFAULT} />
            <Text style={styles.warningText}>{t('admin.featured.unsavedChanges')}</Text>
          </View>
        )}

        {/* Filters */}
        <FeaturedFilters
          filterType={filterType}
          itemCount={filteredItems.length}
          onFilterChange={setFilterType}
          isRTL={isRTL}
        />

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={18} color={colors.error.DEFAULT} />
            <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
            <GlassButton
              title=""
              onPress={() => setError(null)}
              variant="ghost"
              icon={<AlertCircle size={18} />}
            />
          </View>
        )}

        {/* Content List */}
        {isLoading ? (
          <AdminLoadingState message={t('common.loading')} isRTL={isRTL} />
        ) : filteredItems.length === 0 ? (
          <AdminEmptyState
            icon={<Star size={48} color={colors.textSecondary} />}
            title={t('admin.featured.empty')}
            message={t('admin.featured.emptyHint')}
            isRTL={isRTL}
          />
        ) : (
          <GlassReorderableList
            items={filteredItems}
            onReorder={handleReorder}
            renderItem={(item, index, isDragging) => (
              <FeaturedItemCard
                item={item}
                index={index}
                isDragging={isDragging}
                onRemove={handleRemoveFromFeatured}
                isRTL={isRTL}
              />
            )}
            keyExtractor={(item) => item.id}
            style={styles.list}
          />
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warning.DEFAULT + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT + '40',
    marginBottom: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning.DEFAULT,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error.DEFAULT + '20',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error.DEFAULT,
  },
  list: {
    gap: spacing.md,
  },
})
