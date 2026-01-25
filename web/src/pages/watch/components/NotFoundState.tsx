/**
 * Not Found State Component
 * Displays when content is not found
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

interface NotFoundStateProps {
  notFoundLabel: string;
  backToHomeLabel: string;
}

export function NotFoundState({
  notFoundLabel,
  backToHomeLabel,
}: NotFoundStateProps) {
  const navigate = useNavigate();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{notFoundLabel}</Text>
        <Pressable onPress={() => navigate('/')}>
          <Text style={styles.link}>{backToHomeLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 36,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  link: {
    fontSize: fontSize.base,
    color: colors.primary.DEFAULT,
  },
});
