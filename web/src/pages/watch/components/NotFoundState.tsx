/**
 * Not Found State Component
 * Displays when content is not found
 */

import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';

interface NotFoundStateProps {
  notFoundLabel: string;
  backToHomeLabel: string;
}

export function NotFoundState({
  notFoundLabel,
  backToHomeLabel,
}: NotFoundStateProps) {
  return (
    <View style={styles.container}>
      <GlassCard style={styles.card}>
        <Text style={styles.title}>{notFoundLabel}</Text>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Text style={styles.link}>{backToHomeLabel}</Text>
        </Link>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.md,
  },
  card: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  link: {
    fontSize: 16,
    color: colors.primary,
  },
});
