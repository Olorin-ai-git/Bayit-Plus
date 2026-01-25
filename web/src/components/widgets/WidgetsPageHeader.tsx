/**
 * WidgetsPageHeader - Page header with title and create button
 *
 * Displays:
 * - Icon and title
 * - Widget count
 * - New widget button
 * REBUILT: Using StyleSheet and glassmorphic design
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useDirection } from '@/hooks/useDirection';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

const WidgetsPageHeaderPropsSchema = z.object({
  widgetCount: z.number(),
  onCreateWidget: z.function().args().returns(z.void()),
});

type WidgetsPageHeaderProps = z.infer<typeof WidgetsPageHeaderPropsSchema>;

/**
 * WidgetsPageHeader - Header section for widgets page
 */
export default function WidgetsPageHeader({ widgetCount, onCreateWidget }: WidgetsPageHeaderProps) {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  return (
    <View style={styles.container}>
      {/* Left side: Icon + Title */}
      <View style={styles.leftSection}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>⊞</Text>
        </View>
        <View>
          <Text
            style={[styles.title, { textAlign }]}
          >
            {t('nav.widgets')}
          </Text>
          <Text
            style={[styles.subtitle, { textAlign }]}
          >
            {widgetCount} {t('widgets.itemsTotal') || 'total widgets'}
          </Text>
        </View>
      </View>

      {/* Right side: Create button */}
      <GlassButton
        title={`+ ${t('common.new') || 'New'}`}
        onPress={onCreateWidget}
        variant="primary"
        size="md"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glassPurple,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 32,
    color: colors.primary.DEFAULT,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
