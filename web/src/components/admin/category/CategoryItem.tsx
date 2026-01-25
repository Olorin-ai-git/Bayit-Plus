import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { z } from 'zod';
import { GlassView } from '@bayit/shared/ui';
import { colors, borderRadius } from '@olorin/design-tokens';

const CategoryItemPropsSchema = z.object({
  category: z.object({
    id: z.string(),
    name: z.string(),
    name_en: z.string().optional(),
    slug: z.string(),
    order: z.number(),
    is_active: z.boolean(),
    created_at: z.string(),
  }),
  isSelected: z.boolean(),
  textAlign: z.enum(['left', 'right', 'center']),
  onPress: z.function().args(z.string()).returns(z.void()),
});

export type CategoryItemProps = z.infer<typeof CategoryItemPropsSchema>;

export function CategoryItem({
  category,
  isSelected,
  textAlign,
  onPress,
}: CategoryItemProps) {
  return (
    <Pressable
      key={category.id}
      onPress={() => onPress(category.id)}
    >
      <View style={styles.itemContainer}>
        <GlassView
          style={[
            styles.glassContainer,
            isSelected && styles.glassContainerSelected,
          ]}
          intensity={isSelected ? 'high' : 'low'}
        >
          <View style={styles.textContainer}>
            <Text style={[styles.primaryText, { textAlign }]}>
              {category.name}
            </Text>
            {category.name_en && (
              <Text style={[styles.secondaryText, { textAlign }]}>
                {category.name_en}
              </Text>
            )}
          </View>
          {isSelected && <View style={styles.selectedDot} />}
        </GlassView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  glassContainerSelected: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  textContainer: {
    flex: 1,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  secondaryText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = CategoryItem;
  (CategoryItem as any) = (props: any) => {
    CategoryItemPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default CategoryItem;
