import { View, Text, Pressable, Image, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GripVertical, X, Film, Tv } from 'lucide-react'
import { GlassCard } from '@bayit/shared/ui'
import { Content } from '@/services/adminApi'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

interface FeaturedItemCardProps {
  item: Content
  index: number
  isDragging: boolean
  onRemove: (item: Content) => void
  isRTL: boolean
  showOrderNumber?: boolean
}

export default function FeaturedItemCard({
  item,
  index,
  isDragging,
  onRemove,
  isRTL,
  showOrderNumber = true,
}: FeaturedItemCardProps) {
  const { t } = useTranslation()

  return (
    <GlassCard style={[styles.card, isDragging && styles.cardDragging]}>
      <View style={[styles.content, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Drag Handle */}
        <View style={styles.dragHandle} data-drag-handle="true">
          <GripVertical size={20} color={colors.textSecondary} />
        </View>

        {/* Order Badge */}
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{index + 1}</Text>
        </View>

        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Film size={24} color={colors.textSecondary} />
            </View>
          )}
        </View>

        {/* Content Info */}
        <View style={[styles.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Type Badge */}
            <View
              style={[
                styles.typeBadge,
                item.stream_type === 'series' ? styles.seriesBadge : styles.movieBadge,
              ]}
            >
              {item.stream_type === 'series' ? (
                <Tv size={12} color={colors.text} />
              ) : (
                <Film size={12} color={colors.text} />
              )}
              <Text style={styles.typeText}>
                {item.stream_type === 'series' ? t('common.series') : t('common.movie')}
              </Text>
            </View>
            {item.category_name && (
              <Text style={styles.categoryText}>{item.category_name}</Text>
            )}
            {item.year && <Text style={styles.yearText}>{item.year}</Text>}
          </View>
        </View>

        {/* Remove Button */}
        <Pressable
          onPress={() => onRemove(item)}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.removeButton,
            hovered && styles.removeButtonHovered,
          ]}
        >
          <X size={18} color={colors.error.DEFAULT} />
        </Pressable>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  cardDragging: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dragHandle: {
    padding: spacing.xs,
    cursor: 'grab',
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  thumbnailContainer: {
    width: 80,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass.bgMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  seriesBadge: {
    backgroundColor: colors.info.DEFAULT + '20',
  },
  movieBadge: {
    backgroundColor: colors.success.DEFAULT + '20',
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.text,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  yearText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  removeButtonHovered: {
    backgroundColor: colors.error.DEFAULT + '10',
  },
})
