/**
 * FlowItemList Component
 * Displays and manages flow content items with reordering capability
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
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
    <GlassView style={[styles.container, compact && styles.containerCompact]} intensity="low">
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={[styles.headerLeft, isRTL && styles.headerLeftRTL]}>
          <List size={18} color={colors.text} />
          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {t('flows.flowItems.title')}
          </Text>
        </View>
        <Text style={styles.countText}>
          {t('flows.flowItems.count', { count: items.length })}
        </Text>
      </View>

      {/* AI Note */}
      {aiEnabled && items.length === 0 && (
        <View style={[styles.aiNote, isRTL && styles.aiNoteRTL]}>
          <Sparkles size={16} color={colors.warning} />
          <Text style={[styles.aiNoteText, isRTL && styles.textRTL]}>
            {t('flows.aiGenerated')}
          </Text>
        </View>
      )}

      {/* Items List or Empty State */}
      {items.length === 0 && !aiEnabled ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
            {t('flows.flowItems.empty')}
          </Text>
          {editable && (
            <GlassButton
              title={t('flows.addContent')}
              onPress={onAddContent}
              variant="primary"
              icon={<Plus size={18} color="#000" />}
              style={styles.addButton}
            />
          )}
        </View>
      ) : (
        <>
          {/* Scrollable Item List */}
          <ScrollView
            style={[styles.itemsList, compact && styles.itemsListCompact]}
            contentContainerStyle={styles.itemsContent}
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
                  <View style={[styles.deleteConfirm, isRTL && styles.deleteConfirmRTL]}>
                    <Text style={styles.deleteConfirmText}>
                      {t('flows.flowItems.confirmRemove')}
                    </Text>
                    <View style={[styles.deleteActions, isRTL && styles.deleteActionsRTL]}>
                      <Pressable
                        onPress={() => setConfirmDelete(null)}
                        style={styles.deleteCancelButton}
                      >
                        <Text style={styles.deleteCancelText}>{t('common.cancel')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemove(index)}
                        style={styles.deleteConfirmButton}
                      >
                        <Text style={styles.deleteConfirmButtonText}>
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
              style={[styles.addMoreButton, isRTL && styles.addMoreButtonRTL]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={styles.addMoreText}>{t('flows.addContent')}</Text>
            </Pressable>
          )}

          {/* Max Items Warning */}
          {!canAddMore && (
            <Text style={[styles.maxItemsText, isRTL && styles.textRTL]}>
              {t('flows.flowItems.maxReached', { max: maxItems })}
            </Text>
          )}
        </>
      )}
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  containerCompact: {
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLeftRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  countText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: borderRadius.md,
  },
  aiNoteRTL: {
    flexDirection: 'row-reverse',
  },
  aiNoteText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  addButton: {
    marginTop: spacing.sm,
  },
  itemsList: {
    maxHeight: 300,
  },
  itemsListCompact: {
    maxHeight: 200,
  },
  itemsContent: {
    paddingBottom: spacing.sm,
  },
  deleteConfirm: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  deleteConfirmRTL: {
    alignItems: 'flex-end',
  },
  deleteConfirmText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteActionsRTL: {
    flexDirection: 'row-reverse',
  },
  deleteCancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  deleteCancelText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteConfirmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
  },
  deleteConfirmButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  addMoreButtonRTL: {
    flexDirection: 'row-reverse',
  },
  addMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  maxItemsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default FlowItemList;
