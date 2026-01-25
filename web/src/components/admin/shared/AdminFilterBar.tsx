import { View, StyleSheet } from 'react-native'
import { Search } from 'lucide-react'
import { GlassInput, GlassSelect } from '@bayit/shared/ui'
import { spacing, colors, borderRadius } from '@olorin/design-tokens'

interface FilterOption {
  label: string
  value: string
}

interface AdminFilterBarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: Array<{
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
    placeholder?: string
  }>
  isRTL?: boolean
}

export default function AdminFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  isRTL = false,
}: AdminFilterBarProps) {
  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {onSearchChange && (
        <View style={styles.searchContainer}>
          <GlassInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            leftIcon={<Search size={18} color={colors.text.secondary} />}
            style={styles.searchInput}
          />
        </View>
      )}

      {filters.map((filter, index) => (
        <View key={index} style={styles.filterContainer}>
          <GlassSelect
            value={filter.value}
            onValueChange={filter.onChange}
            options={filter.options}
            placeholder={filter.placeholder}
            style={styles.select}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  searchContainer: {
    flex: 1,
    minWidth: 250,
  },
  searchInput: {
    width: '100%',
  },
  filterContainer: {
    minWidth: 180,
  },
  select: {
    width: '100%',
  },
})
