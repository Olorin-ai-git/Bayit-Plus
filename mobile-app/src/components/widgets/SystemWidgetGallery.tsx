/**
 * SystemWidgetGallery - Grid of system widgets with category filtering
 *
 * Displays available system widgets in a grid layout.
 * Filterable by widget category. Shows installed state.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { SystemWidgetCard } from './SystemWidgetCard';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('SystemWidgetGallery');

interface WidgetData {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  type: string;
}

interface SystemWidgetGalleryProps {
  widgets: WidgetData[];
  installedWidgetIds: string[];
  onAdd: (widgetId: string) => void;
  onRemove: (widgetId: string) => void;
}

const GRID_COLUMNS = 2;

export const SystemWidgetGallery: React.FC<SystemWidgetGalleryProps> = ({
  widgets,
  installedWidgetIds,
  onAdd,
  onRemove,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const widgetTypes = useMemo(() => {
    const types = new Set(widgets.map((w) => w.type));
    return Array.from(types);
  }, [widgets]);

  const filteredWidgets = useMemo(
    () =>
      selectedType
        ? widgets.filter((w) => w.type === selectedType)
        : widgets,
    [widgets, selectedType],
  );

  const handleToggle = useCallback(
    (widgetId: string) => {
      if (installedWidgetIds.includes(widgetId)) {
        moduleLogger.debug('Removing widget', { widgetId });
        onRemove(widgetId);
      } else {
        moduleLogger.debug('Adding widget', { widgetId });
        onAdd(widgetId);
      }
    },
    [installedWidgetIds, onAdd, onRemove],
  );

  const renderFilter = useCallback(
    ({ item }: { item: string }) => (
      <Pressable
        onPress={() =>
          setSelectedType((prev) => (prev === item ? null : item))
        }
        style={[
          styles.filterPill,
          selectedType === item && styles.filterPillActive,
        ]}
        accessibilityLabel={item}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedType === item }}
      >
        <Text
          style={[
            styles.filterText,
            selectedType === item && styles.filterTextActive,
          ]}
        >
          {item}
        </Text>
      </Pressable>
    ),
    [selectedType],
  );

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('widgets.galleryLabel')}
      accessibilityRole="list"
    >
      {widgetTypes.length > 1 && (
        <FlatList
          data={widgetTypes}
          renderItem={renderFilter}
          keyExtractor={(item) => item}
          horizontal
          inverted={isRTL}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterContainer}
        />
      )}

      <Text style={[styles.countText, { textAlign }]}>
        {t('widgets.availableCount', { count: filteredWidgets.length })}
      </Text>

      <FlatList
        data={filteredWidgets}
        renderItem={({ item }) => (
          <SystemWidgetCard
            widget={item}
            isAdded={installedWidgetIds.includes(item.id)}
            onAdd={handleToggle}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={GRID_COLUMNS}
        scrollEnabled={false}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    marginBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glassMedium,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  countText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  grid: {
    paddingHorizontal: spacing.sm,
  },
});
