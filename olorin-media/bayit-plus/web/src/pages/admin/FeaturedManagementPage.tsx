import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, AlertCircle, RefreshCw, Save } from 'lucide-react'
import { GlassButton, GlassPageHeader, GlassErrorBanner } from '@bayit/shared/ui'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import { useDirection } from '@/hooks/useDirection'
import { useFeaturedData } from '@/hooks/admin/useFeaturedData'
import FeaturedSectionCarousel from '@/components/admin/featured/FeaturedSectionCarousel'
import AddContentModal from '@/components/admin/featured/AddContentModal'
import AdminLoadingState from '@/components/admin/shared/AdminLoadingState'
import AdminEmptyState from '@/components/admin/shared/AdminEmptyState'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

export default function FeaturedManagementPage() {
  const { t } = useTranslation()
  const { isRTL } = useDirection()

  const {
    sections,
    isLoading,
    isSaving,
    error,
    hasAnyChanges,
    changedSectionCount,
    setError,
    handleReorder,
    handleRemoveFromSection,
    handleAddToSection,
    handleSaveAllSections,
    refresh,
  } = useFeaturedData()

  const [addModalVisible, setAddModalVisible] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  const selectedSection = useMemo(
    () => sections.find((s) => s.section_id === selectedSectionId),
    [sections, selectedSectionId]
  )

  const handleOpenAddModal = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId)
    setAddModalVisible(true)
  }, [])

  const handleCloseAddModal = useCallback(() => {
    setAddModalVisible(false)
    setSelectedSectionId(null)
  }, [])

  const handleAddContent = useCallback(
    async (contentIds: string[]) => {
      if (!selectedSectionId) return
      await handleAddToSection(selectedSectionId, contentIds)
      handleCloseAddModal()
    },
    [selectedSectionId, handleAddToSection, handleCloseAddModal]
  )

  const pageConfig = ADMIN_PAGE_CONFIG.featured
  const IconComponent = pageConfig.icon

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

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
          badge={totalItems}
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
              {hasAnyChanges && (
                <GlassButton
                  title={t('admin.featured.saveButton', { count: changedSectionCount })}
                  onPress={handleSaveAllSections}
                  variant="primary"
                  icon={<Save size={18} />}
                  loading={isSaving}
                />
              )}
            </View>
          }
        />

        {/* Unsaved Changes Warning */}
        {hasAnyChanges && (
          <View style={styles.warningBanner}>
            <AlertCircle size={18} color={colors.warning.DEFAULT} />
            <Text style={styles.warningText}>{t('admin.featured.unsavedChanges')}</Text>
          </View>
        )}

        <GlassErrorBanner
          message={error}
          onDismiss={() => setError(null)}
          marginBottom={spacing.lg}
        />

        {/* Content List */}
        {isLoading ? (
          <AdminLoadingState message={t('common.loading')} isRTL={isRTL} />
        ) : sections.length === 0 || totalItems === 0 ? (
          <AdminEmptyState
            icon={<Star size={48} color={colors.textSecondary} />}
            title={t('admin.featured.empty')}
            message={t('admin.featured.emptyHint')}
            isRTL={isRTL}
          />
        ) : (
          <ScrollView style={styles.sectionsContainer}>
            {sections.map((section) => (
              <FeaturedSectionCarousel
                key={section.section_id}
                sectionId={section.section_id}
                sectionSlug={section.slug}
                items={section.items}
                onReorder={(fromIdx, toIdx) => handleReorder(section.section_id, fromIdx, toIdx)}
                onRemove={(contentId) => handleRemoveFromSection(section.section_id, contentId)}
                onAddContent={() => handleOpenAddModal(section.section_id)}
                isRTL={isRTL}
              />
            ))}
          </ScrollView>
        )}

        {/* Add Content Modal */}
        {addModalVisible && selectedSection && (
          <AddContentModal
            visible={addModalVisible}
            sectionId={selectedSection.section_id}
            sectionSlug={selectedSection.slug}
            existingContentIds={selectedSection.items.map((i) => i.id)}
            onClose={handleCloseAddModal}
            onAdd={handleAddContent}
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
  sectionsContainer: {
    flex: 1,
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
})
