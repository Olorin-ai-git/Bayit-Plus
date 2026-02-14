/**
 * CultureCard
 *
 * Culture content card with image, title, category badge,
 * and optional hero variant for featured content.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassPlaceholder } from '@olorin/glass-ui';
import { useDirection } from '@bayit/shared-hooks';

interface CultureItem {
  id: string;
  title: string;
  image?: string;
  category: string;
  description?: string;
}

interface CultureCardProps {
  item: CultureItem;
  onPress: () => void;
  variant?: 'default' | 'hero';
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = 220;
const HERO_HEIGHT = 200;
const CARD_HEIGHT = 150;

export const CultureCard: React.FC<CultureCardProps> = ({
  item,
  onPress,
  variant = 'default',
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const isHero = variant === 'hero';
  const cardWidth = isHero ? SCREEN_WIDTH - spacing.md * 2 : CARD_WIDTH;
  const imageHeight = isHero ? HERO_HEIGHT : CARD_HEIGHT;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isHero && styles.heroContainer,
        { width: cardWidth },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${item.title}, ${t(`culture.category.${item.category}`)}`}
      accessibilityHint={t('culture.tapToView')}
      accessibilityRole="button"
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={[styles.image, { height: imageHeight }]}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel={item.title}
        />
      ) : (
        <GlassPlaceholder
          contentType="culture"
          width={cardWidth}
          height={imageHeight}
          accessibilityRole="image"
          accessibilityLabel={item.title}
          contentTitle={item.title}
          contentReason="unavailable"
        />
      )}

      <View style={styles.overlay} />

      <View style={styles.contentOverlay}>
        <View
          style={[styles.categoryBadge]}
          accessibilityRole="text"
        >
          <Text style={styles.categoryText}>
            {t(`culture.category.${item.category}`)}
          </Text>
        </View>

        <Text
          style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}
          numberOfLines={isHero ? 3 : 2}
        >
          {item.title}
        </Text>

        {isHero && item.description && (
          <Text
            style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
  },
  heroContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary}60`,
    marginBottom: spacing.xs,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    lineHeight: fontSize.md * 1.3,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: fontSize.sm * 1.4,
  },
});

export default CultureCard;
