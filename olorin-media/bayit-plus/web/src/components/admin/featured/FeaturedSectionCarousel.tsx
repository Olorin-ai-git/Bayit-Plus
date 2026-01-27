/**
 * FeaturedSectionCarousel - Display featured section items as a carousel
 * Admin version with drag-to-reorder and add/remove controls
 */

import { useRef } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { Content } from '@/services/adminApi'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import FeaturedItemCard from './FeaturedItemCard'

interface FeaturedSectionCarouselProps {
  sectionId: string
  sectionSlug: string
  items: Content[]
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (contentId: string) => void
  onAddContent: () => void
  isRTL: boolean
}

export default function FeaturedSectionCarousel({
  sectionId,
  sectionSlug,
  items,
  onReorder,
  onRemove,
  onAddContent,
  isRTL,
}: FeaturedSectionCarouselProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<ScrollView>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 600
      const actualDirection = isRTL ? (direction === 'left' ? 'right' : 'left') : direction
      // @ts-ignore - Web-specific scrollTo API
      scrollRef.current.scrollTo?.({
        x: actualDirection === 'right' ? scrollAmount : -scrollAmount,
        animated: true,
      })
    }
  }

  const ScrollChevronLeft = isRTL ? ChevronRight : ChevronLeft
  const ScrollChevronRight = isRTL ? ChevronLeft : ChevronRight

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
            {sectionSlug}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{items.length}</Text>
          </View>
        </View>

        <GlassButton
          title={t('admin.featured.addContent')}
          onPress={onAddContent}
          variant="outline"
          icon={<Plus size={18} />}
          style={styles.addButton}
        />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('admin.featured.noContentAvailable')}</Text>
          <Text style={styles.emptySubtext}>{t('admin.featured.selectContentToAdd')}</Text>
        </View>
      ) : (
        <View style={styles.carouselContainer}>
          {/* Left Scroll Button */}
          <Pressable
            onPress={() => scroll('left')}
            style={[
              styles.scrollButton,
              isRTL ? styles.scrollButtonRight : styles.scrollButtonLeft,
            ]}
          >
            <GlassView style={styles.scrollButtonInner}>
              <ScrollChevronLeft size={24} color={colors.text} />
            </GlassView>
          </Pressable>

          {/* Right Scroll Button */}
          <Pressable
            onPress={() => scroll('right')}
            style={[
              styles.scrollButton,
              isRTL ? styles.scrollButtonLeft : styles.scrollButtonRight,
            ]}
          >
            <GlassView style={styles.scrollButtonInner}>
              <ScrollChevronRight size={24} color={colors.text} />
            </GlassView>
          </Pressable>

          {/* Items Carousel */}
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {items.map((item, index) => (
              <View key={item.id} style={styles.cardWrapper}>
                <FeaturedItemCard
                  item={item}
                  index={index}
                  isDragging={false}
                  onRemove={() => onRemove(item.id)}
                  isRTL={isRTL}
                  showOrderNumber={true}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  badge: {
    backgroundColor: colors.primary.DEFAULT + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  addButton: {
    minWidth: 140,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  carouselContainer: {
    position: 'relative',
    paddingHorizontal: spacing.md,
  },
  scrollButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    // @ts-ignore - Web transform
    transform: [{ translateY: -32 }],
    opacity: 0,
    // @ts-ignore - Web hover
    ':hover': {
      opacity: 1,
    },
  },
  scrollButtonLeft: {
    left: 0,
  },
  scrollButtonRight: {
    right: 0,
  },
  scrollButtonInner: {
    width: 40,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  cardWrapper: {
    width: 200,
    flexShrink: 0,
  },
})
