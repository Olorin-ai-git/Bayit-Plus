import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { GlassButton } from '@bayit/shared/ui'
import { useState, useMemo } from 'react'
import FeaturedSectionCard from './FeaturedSectionCard'
import { Content } from '@/services/adminApi'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

interface Section {
  section_id: string
  slug: string
  name_key: string
  order: number
  items: Content[]
  hasChanges: boolean
}

interface Props {
  sections: Section[]
  onReorder: (sectionId: string, fromIndex: number, toIndex: number) => void
  onRemove: (sectionId: string, contentId: string) => void
  onAddContent: (sectionId: string) => void
  isRTL: boolean
  onExpand?: (sectionId: string) => void
}

export default function FeaturedSectionsList({
  sections,
  onReorder,
  onRemove,
  onAddContent,
  isRTL,
}: Props) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)

  // Memoize sorted sections
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.order - b.order)
  }, [sections])

  const toggleSection = (sectionId: string) => {
    setExpandedSectionId(expandedSectionId === sectionId ? null : sectionId)
  }

  if (sortedSections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sections available</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {sortedSections.map((section, index) => {
        const isExpanded = expandedSectionId === section.section_id
        const isFirst = index === 0

        return (
          <View key={section.section_id}>
            {!isFirst && <View style={styles.divider} />}

            <GlassButton
              onPress={() => toggleSection(section.section_id)}
              variant="ghost"
              style={[styles.headerButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.headerLeft}>
                  <Text style={styles.sectionName}>{section.slug}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{section.items.length}</Text>
                  </View>
                  {section.hasChanges && <View style={styles.changeDot} />}
                </View>

                {isExpanded ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </View>
            </GlassButton>

            {isExpanded && (
              <View style={styles.contentContainer}>
                <FeaturedSectionCard
                  section={section}
                  onReorder={(fromIdx, toIdx) => onReorder(section.section_id, fromIdx, toIdx)}
                  onRemove={(contentId) => onRemove(section.section_id, contentId)}
                  onAddContent={() => onAddContent(section.section_id)}
                  isRTL={isRTL}
                />
              </View>
            )}
          </View>
        )
      })}
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
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  headerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionName: {
    fontSize: fontSize.base,
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
  changeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning.DEFAULT,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
  },
})
