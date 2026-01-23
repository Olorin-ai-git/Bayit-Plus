import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Search, Plus, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { GlassView, GlassInput } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { CategoryItem } from './CategoryItem';

const CategoryPickerListPropsSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    name_en: z.string().optional(),
    slug: z.string(),
    order: z.number(),
    is_active: z.boolean(),
    created_at: z.string(),
  })),
  selectedValue: z.string().optional(),
  search: z.string(),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  textAlign: z.enum(['left', 'right', 'center']),
  allowCreate: z.boolean(),
  searchPlaceholder: z.string(),
  loadingText: z.string(),
  noResultsText: z.string(),
  noCategoriesText: z.string(),
  createNewText: z.string(),
  onSearchChange: z.function().args(z.string()).returns(z.void()),
  onSelectCategory: z.function().args(z.string()).returns(z.void()),
  onCreateClick: z.function().returns(z.void()),
});

export type CategoryPickerListProps = z.infer<typeof CategoryPickerListPropsSchema>;

export function CategoryPickerList({
  categories,
  selectedValue,
  search,
  isLoading,
  error,
  textAlign,
  allowCreate,
  searchPlaceholder,
  loadingText,
  noResultsText,
  noCategoriesText,
  createNewText,
  onSearchChange,
  onSelectCategory,
  onCreateClick,
}: CategoryPickerListProps) {
  return (
    <GlassView style={styles.container} intensity="high">
      <View style={styles.searchContainer}>
        <GlassInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          icon={<Search size={16} color="rgba(255, 255, 255, 0.6)" />}
          autoFocus
        />
      </View>

      {isLoading && (
        <View style={styles.centerContainer}>
          <Text style={styles.mutedText}>{loadingText}</Text>
        </View>
      )}

      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLoading && !error && categories.length === 0 && (
        <View style={styles.centerContainer}>
          <Text style={styles.mutedText}>
            {search ? noResultsText : noCategoriesText}
          </Text>
        </View>
      )}

      {!isLoading && !error && categories.length > 0 && (
        <ScrollView style={styles.list}>
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              isSelected={selectedValue === category.id}
              textAlign={textAlign}
              onPress={onSelectCategory}
            />
          ))}
        </ScrollView>
      )}

      {allowCreate && (
        <Pressable onPress={onCreateClick}>
          <View style={styles.createButtonContainer}>
            <GlassView style={styles.createButton} intensity="medium">
              <Plus size={16} color={colors.primary} />
              <Text style={styles.createButtonText}>{createNewText}</Text>
            </GlassView>
          </View>
        </Pressable>
      )}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: borderRadius.md,
    maxHeight: 400,
    overflow: 'hidden',
  },
  searchContainer: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  centerContainer: {
    padding: 24,
    alignItems: 'center',
  },
  mutedText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
  },
  list: {
    maxHeight: 240,
  },
  createButtonContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = CategoryPickerList;
  (CategoryPickerList as any) = (props: any) => {
    CategoryPickerListPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default CategoryPickerList;
