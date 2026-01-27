import { View, Text, StyleSheet, Image } from 'react-native'
import { GlassReorderableList, GlassButton } from '@bayit/shared/ui'
import { Trash2 } from 'lucide-react'
import FeaturedItemCard from './FeaturedItemCard'
import { Content } from '@/services/adminApi'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

interface Section {
  section_id: string
  slug: string
  items: Content[]
}

interface Props {
  section: Section
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (contentId: string) => void
  isRTL: boolean
}

export default function FeaturedSectionCard({
  section,
  onReorder,
  onRemove,
  isRTL,
}: Props) {
  if (section.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No featured items in this section</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <GlassReorderableList
        items={section.items}
        onReorder={onReorder}
        renderItem={(item, index, isDragging) => (
          <FeaturedItemCard
            item={item}
            index={index}
            isDragging={isDragging}
            onRemove={() => onRemove(item.id)}
            isRTL={isRTL}
            showOrderNumber={true}
          />
        )}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.md,
  },
})
