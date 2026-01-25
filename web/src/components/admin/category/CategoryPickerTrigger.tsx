import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react';
import { z } from 'zod';
import { GlassView } from '@bayit/shared/ui';
import { colors, borderRadius } from '@olorin/design-tokens';

const CategoryPickerTriggerPropsSchema = z.object({
  selectedCategory: z.object({
    id: z.string(),
    name: z.string(),
    name_en: z.string().optional(),
    slug: z.string(),
    order: z.number(),
    is_active: z.boolean(),
    created_at: z.string(),
  }).nullable(),
  placeholder: z.string(),
  isOpen: z.boolean(),
  isLoading: z.boolean(),
  hasError: z.boolean(),
  textAlign: z.enum(['left', 'right', 'center']),
  onPress: z.function().returns(z.void()),
});

export type CategoryPickerTriggerProps = z.infer<typeof CategoryPickerTriggerPropsSchema>;

export function CategoryPickerTrigger({
  selectedCategory,
  placeholder,
  isOpen,
  isLoading,
  hasError,
  textAlign,
  onPress,
}: CategoryPickerTriggerProps) {
  return (
    <Pressable onPress={onPress} disabled={isLoading}>
      <GlassView
        style={[
          styles.container,
          hasError && styles.containerError,
        ]}
        intensity="medium"
      >
        <Text
          style={[
            styles.text,
            !selectedCategory && styles.textPlaceholder,
            { textAlign },
          ]}
        >
          {selectedCategory ? selectedCategory.name : placeholder}
        </Text>
        <View
          style={[
            styles.iconContainer,
            { transform: [{ rotate: isOpen ? '180deg' : '0deg' }] },
          ]}
        >
          <ChevronDown size={16} color="rgba(255, 255, 255, 0.6)" />
        </View>
      </GlassView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  containerError: {
    borderWidth: 1,
    borderColor: colors.error.DEFAULT,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  textPlaceholder: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  iconContainer: {
    // Transform handled inline for rotation
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = CategoryPickerTrigger;
  (CategoryPickerTrigger as any) = (props: any) => {
    CategoryPickerTriggerPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default CategoryPickerTrigger;
