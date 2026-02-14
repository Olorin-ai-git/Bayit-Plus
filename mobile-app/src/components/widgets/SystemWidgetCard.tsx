/**
 * SystemWidgetCard - Individual widget card in the gallery
 *
 * Shows widget preview image, name, description, and add/remove toggle.
 * Supports accessibility labels and RTL layout.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassCard } from '@olorin/glass-ui/native';
import { GlassButton } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('SystemWidgetCard');

interface WidgetData {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  type: string;
}

interface SystemWidgetCardProps {
  widget: WidgetData;
  onAdd: (widgetId: string) => void;
  isAdded: boolean;
}

export const SystemWidgetCard: React.FC<SystemWidgetCardProps> = ({
  widget,
  onAdd,
  isAdded,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const handleToggle = useCallback(() => {
    moduleLogger.debug('Widget toggle', { widgetId: widget.id, isAdded });
    onAdd(widget.id);
  }, [widget.id, onAdd, isAdded]);

  return (
    <GlassCard
      style={styles.card}
      accessibilityLabel={widget.name}
      accessibilityHint={
        isAdded
          ? t('widgets.removeWidgetHint', { name: widget.name })
          : t('widgets.addWidgetHint', { name: widget.name })
      }
    >
      {widget.previewUrl ? (
        <Image
          source={{ uri: widget.previewUrl }}
          style={styles.preview}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.previewPlaceholder}>
          <NativeIcon name="grid" size="xl" color={colors.textMuted} />
        </View>
      )}
      <View style={styles.infoSection}>
        <Text
          style={[styles.widgetName, { textAlign }]}
          numberOfLines={1}
        >
          {widget.name}
        </Text>
        <Text
          style={[styles.widgetDescription, { textAlign }]}
          numberOfLines={2}
        >
          {widget.description}
        </Text>
        <View style={styles.typeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{widget.type}</Text>
          </View>
        </View>
        <GlassButton
          variant={isAdded ? 'secondary' : 'primary'}
          onPress={handleToggle}
          style={styles.actionButton}
          accessibilityLabel={
            isAdded
              ? t('widgets.removeWidget')
              : t('widgets.addWidget')
          }
          accessibilityRole="button"
        >
          {isAdded ? t('widgets.added') : t('widgets.add')}
        </GlassButton>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    margin: spacing.xs,
  },
  preview: {
    width: '100%',
    height: 100,
  },
  previewPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.glassMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  widgetName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  widgetDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  typeRow: {
    flexDirection: 'row',
  },
  typeBadge: {
    backgroundColor: colors.glassMedium,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  actionButton: {
    marginTop: spacing.xs,
  },
});
