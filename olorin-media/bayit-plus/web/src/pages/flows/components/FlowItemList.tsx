/**
 * FlowItemList Component
 * Displays and manages flow content items with reordering capability
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, List, Sparkles } from 'lucide-react';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import { FlowItemCard } from '../../../../../shared/components/flows';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import type { FlowItem, ContentItem } from '../types/flows.types';
import { useFlowItems } from '../hooks/useFlowItems';

interface FlowItemListProps {
  items: FlowItem[];
  onItemsChange: (items: FlowItem[]) => void;
  onAddContent: () => void;
  editable?: boolean;
  maxItems?: number;
  aiEnabled?: boolean;
  isRTL?: boolean;
  compact?: boolean;
}

export const FlowItemList: React.FC<FlowItemListProps> = ({
  items: initialItems,
  onItemsChange,
  onAddContent,
  editable = true,
  maxItems = 20,
  aiEnabled = false,
  isRTL = false,
  compact = false,
}) => {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const {
    items,
    moveUp,
    moveDown,
    removeItem,
  } = useFlowItems({
    initialItems,
    maxItems,
    onChange: onItemsChange,
  });

  const handleRemove = (index: number) => {
    if (confirmDelete === index) {
      removeItem(index);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(index);
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const canAddMore = items.length < maxItems;

  return (
    <GlassView className={`${compact ? 'p-2' : 'p-4'} rounded-lg`} intensity="low">
      {/* Header */}
      <View className={`flex ${isRTL ? 'flex-row-reverse justify-between' : 'flex-row justify-between'} items-center mb-4`}>
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
          <List size={18} color={colors.text} />
          <Text className={`text-sm font-semibold text-white ${isRTL ? 'text-right' : ''}`}>
            {t('flows.flowItems.title')}
          </Text>
        </View>
        <Text className={`text-xs text-[${colors.textMuted}]`}>
          {t('flows.flowItems.count', { count: items.length })}
        </Text>
      </View>

      {/* AI Note */}
      {aiEnabled && items.length === 0 && (
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 p-2 mb-4 bg-[rgba(255,179,0,0.1)] rounded-lg`}>
          <Sparkles size={16} color={colors.warning} />
          <Text className={`text-xs text-[${colors.warning}] font-medium ${isRTL ? 'text-right' : ''}`}>
            {t('flows.aiGenerated')}
          </Text>
        </View>
      )}

      {/* Items List or Empty State */}
      {items.length === 0 && !aiEnabled ? (
        <View className="py-6 items-center">
          <Text className={`text-sm text-[${colors.textMuted}] text-center mb-4 leading-5 ${isRTL ? 'text-right' : ''}`}>
            {t('flows.flowItems.empty')}
          </Text>
          {editable && (
            <GlassButton
              title={t('flows.addContent')}
              onPress={onAddContent}
              variant="primary"
              icon={<Plus size={18} color="#000" />}
              style={{ marginTop: spacing.sm }}
            />
          )}
        </View>
      ) : (
        <>
          {/* Scrollable Item List */}
          <ScrollView
            className={compact ? 'max-h-[200px]' : 'max-h-[300px]'}
            contentContainerStyle={{ paddingBottom: spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, index) => (
              <View key={`${item.content_id}-${index}`}>
                <FlowItemCard
                  item={item}
                  index={index}
                  totalItems={items.length}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                  onRemove={() => handleRemove(index)}
                  editable={editable}
                  isRTL={isRTL}
                />
                {/* Delete Confirmation */}
                {confirmDelete === index && (
                  <View className={`bg-[rgba(255,59,48,0.1)] p-2 -mt-2 mb-2 rounded-lg ${isRTL ? 'items-end' : ''}`}>
                    <Text className={`text-xs text-[${colors.error}] mb-1`}>
                      {t('flows.flowItems.confirmRemove')}
                    </Text>
                    <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                      <Pressable
                        onPress={() => setConfirmDelete(null)}
                        className="px-4 py-1"
                      >
                        <Text className={`text-xs text-[${colors.textSecondary}]`}>{t('common.cancel')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemove(index)}
                        className={`px-4 py-1 bg-[${colors.error}] rounded`}
                      >
                        <Text className="text-xs text-white font-semibold">
                          {t('flows.flowItems.remove')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Add More Button */}
          {editable && canAddMore && (
            <Pressable
              onPress={onAddContent}
              className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-center gap-2 py-4 mt-2 border-t border-white/10`}
            >
              <Plus size={16} color={colors.primary} />
              <Text className={`text-sm text-[${colors.primary}] font-semibold`}>{t('flows.addContent')}</Text>
            </Pressable>
          )}

          {/* Max Items Warning */}
          {!canAddMore && (
            <Text className={`text-xs text-[${colors.textMuted}] text-center mt-4 ${isRTL ? 'text-right' : ''}`}>
              {t('flows.flowItems.maxReached', { max: maxItems })}
            </Text>
          )}
        </>
      )}
    </GlassView>
  );
};

export default FlowItemList;
