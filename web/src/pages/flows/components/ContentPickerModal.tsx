/**
 * ContentPickerModal Component
 * Modal for selecting content to add to a flow
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Search, Radio, Headphones, Film, Mic } from 'lucide-react';
import { GlassButton, GlassInput, GlassTabs, GlassView } from '@bayit/shared/ui';
import { ContentItemCard } from '../../../../../shared/components/flows';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useContentPicker } from '../hooks/useContentPicker';
import type { ContentItem, FlowItem, ContentType } from '../types/flows.types';

interface ContentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (items: ContentItem[]) => void;
  existingItems: FlowItem[];
  defaultType?: ContentType;
}

const TAB_ICONS: Record<ContentType, React.ReactNode> = {
  live: <Radio size={16} />,
  radio: <Headphones size={16} />,
  vod: <Film size={16} />,
  podcast: <Mic size={16} />,
};

export const ContentPickerModal: React.FC<ContentPickerModalProps> = ({
  visible,
  onClose,
  onAdd,
  existingItems,
  defaultType = 'live',
}) => {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const isMobile = width < 768;

  const {
    activeTab,
    setActiveTab,
    content,
    selectedIds,
    toggleSelection,
    selectedItems,
    existingIds,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    hasMore,
    loadMore,
    clearSelection,
  } = useContentPicker({ existingItems, defaultType });

  const handleAdd = () => {
    onAdd(selectedItems);
    clearSelection();
    onClose();
  };

  const tabs = [
    { id: 'live', label: t('flows.contentPicker.tabs.live'), icon: TAB_ICONS.live },
    { id: 'radio', label: t('flows.contentPicker.tabs.radio'), icon: TAB_ICONS.radio },
    { id: 'vod', label: t('flows.contentPicker.tabs.vod'), icon: TAB_ICONS.vod },
    { id: 'podcast', label: t('flows.contentPicker.tabs.podcast'), icon: TAB_ICONS.podcast },
  ];

  const numColumns = isMobile ? 2 : width >= 1024 ? 4 : 3;

  // Don't render if not visible
  if (!visible) return null;

  // On web, render as fixed-position overlay (no Modal needed since we're already in a modal context)
  // This ensures proper z-index stacking
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />

        <GlassView style={[styles.modal, isMobile && styles.modalMobile]} intensity="high">
          {/* Header */}
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <Text style={[styles.title, isRTL && styles.textRTL]}>
              {t('flows.contentPicker.title')}
            </Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <GlassTabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as ContentType)}
              variant="pills"
            />
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <GlassInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('flows.contentPicker.search')}
              icon={<Search size={18} color={colors.textMuted} />}
              containerStyle={styles.searchInput}
            />
            {selectedIds.size > 0 && (
              <GlassView style={styles.selectedBadge}>
                <Text style={styles.selectedText}>
                  {t('flows.contentPicker.selected', { count: selectedIds.size })}
                </Text>
              </GlassView>
            )}
          </View>

          {/* Content Grid */}
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentGrid}>
            {loading && content.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, isRTL && styles.textRTL]}>{t('common.loading')}</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{error}</Text>
                <GlassButton
                  title={t('common.retry')}
                  onPress={() => setActiveTab(activeTab)}
                  variant="secondary"
                />
              </View>
            ) : content.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                  {t('flows.contentPicker.noResults')}
                </Text>
              </View>
            ) : (
              <View style={[styles.grid, { gap: spacing.md }]}>
                {content.map((item, index) => (
                  <View
                    key={item.id}
                    style={[styles.gridItem, { width: `${100 / numColumns - 2}%` as any }]}
                  >
                    <ContentItemCard
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      isAlreadyAdded={existingIds.has(item.id)}
                      onToggle={() => toggleSelection(item.id)}
                      isRTL={isRTL}
                      hasTVPreferredFocus={index === 0}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Load More */}
            {hasMore && !loading && (
              <GlassButton
                title={t('flows.contentPicker.loadMore')}
                onPress={loadMore}
                variant="ghost"
                style={styles.loadMoreButton}
              />
            )}

            {loading && content.length > 0 && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loadingMore} />
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, isRTL && styles.footerRTL]}>
            <GlassButton
              title={t('common.cancel')}
              onPress={onClose}
              variant="ghost"
              style={styles.footerButton}
            />
            <GlassButton
              title={t('flows.contentPicker.addSelected')}
              onPress={handleAdd}
              variant="primary"
              disabled={selectedIds.size === 0}
              style={styles.footerButton}
            />
          </View>
        </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    // @ts-ignore - Web fixed positioning
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    // @ts-ignore - Web z-index (higher than parent modal)
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    width: '100%',
    maxWidth: 900,
    maxHeight: 600,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    // @ts-ignore - Web z-index and flex
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalMobile: {
    maxWidth: '100%',
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    flexShrink: 0,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  closeButton: {
    padding: spacing.sm,
  },
  tabsContainer: {
    flexShrink: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
  },
  selectedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  selectedText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  contentScroll: {
    flex: 1,
    marginBottom: spacing.md,
    minHeight: 0,
    // @ts-ignore - Web overflow
    overflow: 'auto',
  },
  contentGrid: {
    paddingBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    marginBottom: spacing.md,
  },
  loadingContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  loadingMore: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexShrink: 0,
  },
  footerRTL: {
    flexDirection: 'row-reverse',
  },
  footerButton: {
    minWidth: 120,
  },
});

export default ContentPickerModal;
