import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { colors } from '@bayit/shared/theme';

const CategoryPickerStateMessagesPropsSchema = z.object({
  error: z.string().nullable(),
});

export type CategoryPickerStateMessagesProps = z.infer<typeof CategoryPickerStateMessagesPropsSchema>;

export function CategoryPickerStateMessages({
  error,
}: CategoryPickerStateMessagesProps) {
  if (!error) return null;

  return (
    <View style={styles.container}>
      <AlertCircle size={14} color={colors.error} />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = CategoryPickerStateMessages;
  (CategoryPickerStateMessages as any) = (props: any) => {
    CategoryPickerStateMessagesPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default CategoryPickerStateMessages;
