import { View, Text, StyleSheet, Image } from 'react-native'
import { GlassReorderableList, GlassButton } from '@bayit/shared/ui'
import { Trash2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  onAddContent: () => void
  isRTL: boolean
}

export default function FeaturedSectionCard({
  section,
  onReorder,
  onRemove,
  onAddContent,
  isRTL,
}: Props) {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <GlassButton
        title={t('admin.featured.addContent')}
        onPress={onAddContent}
        variant="outline"
        icon={<Plus size={18} />}
        style={[styles.addButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      />
      {section.items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No featured items in this section</Text>
        </View>
      ) : (
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
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  addButton: {
    width: '100%',
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
