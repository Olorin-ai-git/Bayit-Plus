/**
 * WidgetsPageHeader - Page header with title, create button, and selection controls
 *
 * Displays:
 * - Icon and title
 * - Widget count
 * - Select / Cancel / Delete / New widget buttons
 * REBUILT: Using StyleSheet and glassmorphic design
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CheckSquare, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { useWidgetStore } from '@/stores/widgetStore';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@olorin/design-tokens';

const WidgetsPageHeaderPropsSchema = z.object({
  widgetCount: z.number(),
  onCreateWidget: z.function().args().returns(z.void()),
  selectMode: z.boolean(),
  onToggleSelectMode: z.function().args().returns(z.void()),
  selectedCount: z.number(),
  onBulkDelete: z.function().args().returns(z.void()),
  onSelectAll: z.function().args().returns(z.void()),
});

type WidgetsPageHeaderProps = z.infer<typeof WidgetsPageHeaderPropsSchema>;

/**
 * WidgetsPageHeader - Header section for widgets page
 */
export default function WidgetsPageHeader({
  widgetCount,
  onCreateWidget,
  selectMode,
  onToggleSelectMode,
  selectedCount,
  onBulkDelete,
  onSelectAll,
}: WidgetsPageHeaderProps) {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { isDockVisible, toggleDockVisible } = useWidgetStore();

  return (
    <View style={styles.container}>
      {/* Left side: Icon + Title */}
      <View style={styles.leftSection}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>&#x229e;</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>
            {t('nav.widgets')}
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {widgetCount} {t('widgets.itemsTotal')}
          </Text>
        </View>
      </View>

      {/* Right side: Action buttons */}
      <View style={styles.rightSection}>
        {selectMode ? (
          <>
            <GlassButton
              title={t('widgets.selectAll')}
              onPress={onSelectAll}
              variant="ghost"
              size="md"
            />
            <GlassButton
              title={`${t('widgets.deleteSelected')} (${selectedCount})`}
              onPress={onBulkDelete}
              variant="danger"
              size="md"
              disabled={selectedCount === 0}
              icon={<Trash2 size={16} color={colors.text} />}
            />
            <GlassButton
              title=""
              onPress={onToggleSelectMode}
              variant="ghost"
              size="md"
              icon={<X size={16} color={colors.text} />}
              accessibilityLabel={t('widgets.cancelSelection')}
            />
          </>
        ) : (
          <>
            <GlassButton
              title={isDockVisible ? t('widgets.hideDock') : t('widgets.showDock')}
              onPress={toggleDockVisible}
              variant="ghost"
              size="md"
              icon={isDockVisible
                ? <EyeOff size={16} color={colors.text} />
                : <Eye size={16} color={colors.text} />
              }
            />
            <GlassButton
              title={t('widgets.select')}
              onPress={onToggleSelectMode}
              variant="ghost"
              size="md"
              icon={<CheckSquare size={16} color={colors.text} />}
            />
            <GlassButton
              title={`+ ${t('common.new')}`}
              onPress={onCreateWidget}
              variant="primary"
              size="md"
            />
          </>
        )}
      </View>
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
