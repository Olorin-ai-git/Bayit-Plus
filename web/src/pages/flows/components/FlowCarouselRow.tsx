/**
 * FlowCarouselRow Component
 * Horizontal scrolling row of flow cards grouped by category
 * Netflix-style carousel with TV D-pad support
 */

import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
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
    <View className={isTV ? 'mb-16' : 'mb-6'}>
      {/* Row Header */}
      <View className={`flex-row justify-between items-center mb-3 ${isTV ? 'px-16' : 'px-6'} ${isRTL ? 'flex-row-reverse' : ''}`}>
        <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Text style={{ fontSize: isTV ? 36 : 28 }}>{config.emoji}</Text>
          <Text className={`font-bold text-white ${isTV ? 'text-4xl' : 'text-2xl'} ${isRTL ? 'text-right' : ''}`}>
            {t(config.key)}
          </Text>
        </View>

        {onSeeAll && flows.length > 0 && (
          <Pressable
            className={`flex-row items-center gap-1 py-2 px-3 rounded-lg bg-white/5 border border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}
            onPress={onSeeAll}
          >
            <Text className={`font-semibold text-purple-500 ${isTV ? 'text-lg' : 'text-sm'}`}>
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
        <View className={`py-16 items-center bg-white/5 border border-white/10 border-dashed rounded-lg ${isTV ? 'mx-16' : 'mx-6'}`}>
          <Text className={`text-sm text-gray-400 text-center ${isRTL ? 'text-right' : ''}`}>
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
          contentContainerStyle={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            paddingHorizontal: isTV ? spacing.xl * 2 : spacing.lg,
            gap: isTV ? spacing.lg : spacing.md,
            paddingVertical: spacing.md,
          }}
          decelerationRate="fast"
          snapToInterval={cardWidth + cardGap}
          snapToAlignment="start"
          className="overflow-visible"
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

export default FlowCarouselRow;
