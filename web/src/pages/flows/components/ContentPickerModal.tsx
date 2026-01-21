/**
 * ContentPickerModal Component
 * Modal for selecting content to add to a flow
 */

import React from 'react';
import {
  View,
  Text,
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

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Find the index of the first item that's not already added (for TV focus)
const findFirstFocusableIndex = (content: any[], existingIds: Set<string>): number => {
  const firstNotAddedIndex = content.findIndex(item => !existingIds.has(item.id));
  return firstNotAddedIndex >= 0 ? firstNotAddedIndex : 0;
};

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

  // For TV mode: find the first focusable item (not already added)
  const firstFocusableIndex = IS_TV_BUILD ? findFirstFocusableIndex(content, existingIds) : 0;

  // Don't render if not visible
  if (!visible) return null;

  // On web, render as fixed-position overlay (no Modal needed since we're already in a modal context)
  // This ensures proper z-index stacking
  return (
    <View className={`${Platform.OS === 'web' ? 'fixed' : 'absolute'} inset-0 bg-black/70 justify-center items-center p-${spacing.lg} z-[9999]`}>
      <Pressable className="absolute inset-0" onPress={onClose} />

        <GlassView className={`w-full ${IS_TV_BUILD ? 'max-w-[1200px] max-h-[700px] p-${spacing.xl}' : 'max-w-[900px] max-h-[600px] p-${spacing.lg}'} ${isMobile ? 'max-w-full max-h-[95%]' : ''} rounded-2xl z-[10000] flex flex-col overflow-hidden`} intensity="high">
          {/* Header */}
          <View className={`flex-row justify-between items-center mb-${spacing.lg} flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Text className={`text-2xl font-bold text-[${colors.text}] ${isRTL ? 'text-right' : ''}`}>
              {t('flows.contentPicker.title')}
            </Text>
            <Pressable className={`p-${spacing.sm}`} onPress={onClose}>
              <X size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View className="flex-shrink-0">
            <GlassTabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as ContentType)}
              variant="pills"
            />
          </View>

          {/* Search */}
          <View className={`flex-row items-center gap-${spacing.md} mt-${spacing.md} mb-${spacing.lg} flex-shrink-0`}>
            <View className="flex-1">
              <GlassInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('flows.contentPicker.search')}
                icon={<Search size={18} color={colors.textMuted} />}
              />
            </View>
            {selectedIds.size > 0 && (
              <GlassView className={`px-${spacing.md} py-${spacing.sm} rounded-full`}>
                <Text className="text-sm text-[${colors.primary}] font-semibold">
                  {t('flows.contentPicker.selected', { count: selectedIds.size })}
                </Text>
              </GlassView>
            )}
          </View>

          {/* Content Grid */}
          <ScrollView className={`flex-1 mb-${spacing.md} min-h-0 overflow-auto`} contentContainerStyle={{ paddingBottom: spacing.md }}>
            {loading && content.length === 0 ? (
              <View className={`py-${spacing.xl * 2} items-center`}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className={`mt-${spacing.md} text-sm text-[${colors.textMuted}] ${isRTL ? 'text-right' : ''}`}>{t('common.loading')}</Text>
              </View>
            ) : error ? (
              <View className={`py-${spacing.xl * 2} items-center gap-${spacing.md}`}>
                <Text className={`text-sm text-[${colors.error}] ${isRTL ? 'text-right' : ''}`}>{error}</Text>
                <GlassButton
                  title={t('common.retry')}
                  onPress={() => setActiveTab(activeTab)}
                  variant="secondary"
                />
              </View>
            ) : content.length === 0 ? (
              <View className={`py-${spacing.xl * 2} items-center`}>
                <Text className={`text-sm text-[${colors.textMuted}] ${isRTL ? 'text-right' : ''}`}>
                  {t('flows.contentPicker.noResults')}
                </Text>
              </View>
            ) : (
              <View className={`flex-row flex-wrap gap-${spacing.md}`}>
                {content.map((item, index) => (
                  <View
                    key={item.id}
                    className={`mb-${spacing.md}`}
                    style={{ width: `${100 / numColumns - 2}%` }}
                  >
                    <ContentItemCard
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      isAlreadyAdded={existingIds.has(item.id)}
                      onToggle={() => toggleSelection(item.id)}
                      isRTL={isRTL}
                      hasTVPreferredFocus={IS_TV_BUILD ? index === firstFocusableIndex : false}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Load More */}
            {hasMore && !loading && (
              <View className={`self-center mt-${spacing.md}`}>
                <GlassButton
                  title={t('flows.contentPicker.loadMore')}
                  onPress={loadMore}
                  variant="ghost"
                />
              </View>
            )}

            {loading && content.length > 0 && (
              <View className={`mt-${spacing.md}`}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View className={`flex-row justify-end gap-${spacing.md} pt-${spacing.md} border-t border-white/10 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <View className="min-w-[120px]">
              <GlassButton
                title={t('common.cancel')}
                onPress={onClose}
                variant="ghost"
              />
            </View>
            <View className="min-w-[120px]">
              <GlassButton
                title={t('flows.contentPicker.addSelected')}
                onPress={handleAdd}
                variant="primary"
                disabled={selectedIds.size === 0}
              />
            </View>
          </View>
        </GlassView>
    </View>
  );
};

export default ContentPickerModal;
