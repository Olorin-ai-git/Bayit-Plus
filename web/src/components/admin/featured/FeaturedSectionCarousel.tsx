/**
 * FeaturedSectionCarousel - Display featured section items as a 3D carousel
 * Features:
 * - Netflix-style 3D perspective with center enlargement
 * - Drag to rotate functionality
 * - Smooth spring animations
 * - Admin controls for add/remove
 */

import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { GlassView, GlassButton, GlassCarousel3D } from '@bayit/shared/ui'
import { Content } from '@/services/adminApi'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import CarouselPosterCard from './CarouselPosterCard'

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
  const [activeIndex, setActiveIndex] = useState(0)

  const handleIndexChange = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.titleSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
        <View style={styles.carouselWrapper}>
          {/* Navigation Arrows */}
          <Pressable
            onPress={() => {
              const newIndex = Math.max(0, activeIndex - 1)
              setActiveIndex(newIndex)
            }}
            style={[styles.navButton, isRTL ? styles.navButtonRight : styles.navButtonLeft]}
            disabled={activeIndex === 0}
          >
            <GlassView style={[styles.navButtonInner, activeIndex === 0 && styles.navButtonDisabled]}>
              {isRTL ? (
                <ChevronRight size={28} color={colors.text} />
              ) : (
                <ChevronLeft size={28} color={colors.text} />
              )}
            </GlassView>
          </Pressable>

          <Pressable
            onPress={() => {
              const newIndex = Math.min(items.length - 1, activeIndex + 1)
              setActiveIndex(newIndex)
            }}
            style={[styles.navButton, isRTL ? styles.navButtonLeft : styles.navButtonRight]}
            disabled={activeIndex === items.length - 1}
          >
            <GlassView
              style={[
                styles.navButtonInner,
                activeIndex === items.length - 1 && styles.navButtonDisabled,
              ]}
            >
              {isRTL ? (
                <ChevronLeft size={28} color={colors.text} />
              ) : (
                <ChevronRight size={28} color={colors.text} />
              )}
            </GlassView>
          </Pressable>

          {/* 3D Carousel */}
          <GlassCarousel3D
            itemWidth={180}
            itemHeight={270}
            perspective={1200}
            rotationFactor={25}
            scaleFactor={0.12}
            gap={24}
            isRTL={isRTL}
            activeIndex={activeIndex}
            onIndexChange={handleIndexChange}
            showPagination={true}
            onSwipeUpRemove={(index) => {
              const item = items[index]
              if (item) {
                onRemove(item.id)
              }
            }}
          >
            {items.map((item, index) => (
              <CarouselPosterCard
                key={item.id}
                item={item}
                index={index}
                onRemove={() => onRemove(item.id)}
                isRTL={isRTL}
              />
            ))}
          </GlassCarousel3D>

          {/* Active Item Info */}
          {items[activeIndex] && (
            <View style={styles.activeInfo}>
              <Text style={[styles.activeTitle, { textAlign: 'center' }]}>
                {items[activeIndex].title}
              </Text>
              {items[activeIndex].description && (
                <Text style={styles.activeDescription} numberOfLines={2}>
                  {items[activeIndex].description}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  badge: {
    backgroundColor: colors.primary.DEFAULT + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  addButton: {
    minWidth: 160,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  carouselWrapper: {
    position: 'relative',
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 20,
    // @ts-ignore - Web transform
    transform: [{ translateY: -40 }],
  },
  navButtonLeft: {
    left: spacing.lg,
  },
  navButtonRight: {
    right: spacing.lg,
  },
  navButtonInner: {
    width: 56,
    height: 80,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web-specific
    backdropFilter: 'blur(12px)',
    cursor: 'pointer',
  },
  navButtonDisabled: {
    opacity: 0.3,
    // @ts-ignore - Web-specific
    cursor: 'not-allowed',
  },
  activeInfo: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 600,
  },
  activeTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  activeDescription: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
})
