/**
 * LocationContentRow - Content row filtered by Israeli city location
 *
 * Displays content associated with a selected city,
 * with a "See All" action and horizontal scroll layout.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassCard } from '@olorin/glass-ui/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('LocationContentRow');

interface LocationItem {
  id: string;
  title: string;
  imageUrl: string;
  type?: string;
}

interface LocationContentRowProps {
  location: string;
  items: LocationItem[];
  onItemPress: (item: LocationItem) => void;
  onSeeAll: () => void;
}

const CARD_WIDTH = 150;
const CARD_HEIGHT = 100;

export const LocationContentRow: React.FC<LocationContentRowProps> = ({
  location,
  items,
  onItemPress,
  onSeeAll,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const handleItemPress = useCallback(
    (item: LocationItem) => {
      moduleLogger.debug('Location content item pressed', {
        itemId: item.id,
        location,
      });
      onItemPress(item);
    },
    [onItemPress, location],
  );

  const renderItem = useCallback(
    ({ item }: { item: LocationItem }) => (
      <Pressable
        onPress={() => handleItemPress(item)}
        style={styles.cardWrapper}
        accessibilityLabel={item.title}
        accessibilityHint={t('location.itemHint', { location })}
        accessibilityRole="button"
      >
        <GlassCard style={styles.card}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder} />
          )}
          <View style={styles.cardContent}>
            <Text
              style={[
                styles.cardTitle,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>
        </GlassCard>
      </Pressable>
    ),
    [handleItemPress, isRTL, location, t],
  );

  if (items.length === 0) return null;

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('location.sectionLabel', { location })}
      accessibilityRole="list"
    >
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('location.contentFrom', { location })}
        </Text>
        <Pressable
          onPress={onSeeAll}
          accessibilityLabel={t('common.seeAll')}
          accessibilityHint={t('location.seeAllHint', { location })}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        inverted={isRTL}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardImagePlaceholder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.glassMedium,
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    lineHeight: fontSize.sm * 1.3,
  },
});
