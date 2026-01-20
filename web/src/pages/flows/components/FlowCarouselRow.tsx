/**
 * FlowCarouselRow Component
 * Horizontal scrolling row of flow cards grouped by category
 * Netflix-style carousel with TV D-pad support
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { isTV } from '@bayit/shared-utils/platform';
import { useDirection } from '@/hooks/useDirection';
import { FlowCarouselCard } from './FlowCarouselCard';
import type { Flow } from '../types/flows.types';

// Category configuration with emojis
export type FlowCategory = 'morning' | 'evening' | 'shabbat' | 'custom' | 'system' | 'all';

const CATEGORY_CONFIG: Record<FlowCategory, { emoji: string; key: string }> = {
  morning: { emoji: '🌅', key: 'flows.categories.morning' },
  evening: { emoji: '🌙', key: 'flows.categories.evening' },
  shabbat: { emoji: '🕯️', key: 'flows.categories.shabbat' },
  custom: { emoji: '✨', key: 'flows.categories.custom' },
  system: { emoji: '⚙️', key: 'flows.categories.system' },
  all: { emoji: '📺', key: 'flows.categories.all' },
};

interface FlowCarouselRowProps {
  category: FlowCategory;
  flows: Flow[];
  onFlowPress: (flow: Flow) => void;
  onSeeAll?: () => void;
  hideIfEmpty?: boolean;
}

export function FlowCarouselRow({
  category,
  flows,
  onFlowPress,
  onSeeAll,
  hideIfEmpty = true,
}: FlowCarouselRowProps) {
  const { t } = useTranslation();
  const { isRTL, flexDirection } = useDirection();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const scrollRef = useRef<ScrollView>(null);

  const config = CATEGORY_CONFIG[category];

  // Hide if no flows and hideIfEmpty is true
  if (flows.length === 0 && hideIfEmpty) {
    return null;
  }

  // Card dimensions for scroll calculations
  const cardWidth = isTV ? 280 : 220;
  const cardGap = isTV ? 24 : 16;

  // Scroll to focused card
  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const offset = index * (cardWidth + cardGap);
      scrollRef.current.scrollTo({
        x: isRTL ? -offset : offset,
        animated: true,
      });
    }
  };

  const handleCardFocus = (index: number) => {
    setFocusedIndex(index);
    scrollToCard(index);
  };

  return (
    <View style={styles.container}>
      {/* Row Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={[styles.titleContainer, { flexDirection }]}>
          <Text style={styles.emoji}>{config.emoji}</Text>
          <Text style={[styles.title, isRTL && styles.titleRTL]}>
            {t(config.key)}
          </Text>
        </View>

        {onSeeAll && flows.length > 0 && (
          <Pressable
            style={[styles.seeAllBtn, { flexDirection }]}
            onPress={onSeeAll}
          >
            <Text style={styles.seeAllText}>
              {t('flows.carousel.seeAll')}
            </Text>
            {isRTL ? (
              <ChevronLeft size={16} color={colors.primary} />
            ) : (
              <ChevronRight size={16} color={colors.primary} />
            )}
          </Pressable>
        )}
      </View>

      {/* Empty State */}
      {flows.length === 0 && !hideIfEmpty && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
            {t('flows.carousel.noFlows')}
          </Text>
        </View>
      )}

      {/* Cards Carousel */}
      {flows.length > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.carouselContent,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          style={styles.carousel}
          decelerationRate="fast"
          snapToInterval={cardWidth + cardGap}
          snapToAlignment="start"
        >
          {flows.map((flow, index) => (
            <FlowCarouselCard
              key={flow.id}
              flow={flow}
              onPress={() => onFlowPress(flow)}
              isRTL={isRTL}
              isFocused={focusedIndex === index}
              onFocus={() => handleCardFocus(index)}
              onBlur={() => setFocusedIndex(-1)}
              hasTVPreferredFocus={index === 0}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: isTV ? spacing.xl * 2 : spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTV ? spacing.lg : spacing.md,
    paddingHorizontal: isTV ? spacing.xl * 2 : spacing.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: isTV ? 36 : 28,
  },
  title: {
    fontSize: isTV ? 36 : 24,
    fontWeight: '700',
    color: colors.text,
  },
  titleRTL: {
    textAlign: 'right',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // @ts-ignore - Web transition
    transition: 'all 0.2s ease',
  },
  seeAllText: {
    fontSize: isTV ? 18 : 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyContainer: {
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: borderRadius.lg,
    marginHorizontal: isTV ? spacing.xl * 2 : spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: isTV ? 18 : 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'right',
  },
  carousel: {
    overflow: 'visible' as any,
  },
  carouselContent: {
    paddingHorizontal: isTV ? spacing.xl * 2 : spacing.lg,
    gap: isTV ? spacing.lg : spacing.md,
    paddingVertical: spacing.md,
  },
});

export default FlowCarouselRow;
