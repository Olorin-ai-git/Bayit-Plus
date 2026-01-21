import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../components';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '@bayit/shared/hooks';
import { demoFavorites, type FavoriteItem } from '../demo/favorites';

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  channel: '📡',
  podcast: '🎙️',
  radio: '📻',
};

const FavoriteCard: React.FC<{
  item: FavoriteItem;
  onPress: () => void;
  onRemove: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, onRemove, index, getLocalizedText }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { isRTL, textAlign } = useDirection();

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.cardTouchable}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderIcon}>{TYPE_ICONS[item.type] || '⭐'}</Text>
          </View>
        )}
        <View style={[styles.typeBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <Text style={styles.typeBadgeText}>{TYPE_ICONS[item.type]}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.subtitle && (
            <Text style={[styles.cardSubtitle, { textAlign }]} numberOfLines={1}>
              {getLocalizedText(item, 'subtitle')}
            </Text>
          )}
        </View>
        {isFocused && (
          <View style={styles.overlay}>
            <View style={styles.overlayButtons}>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
              <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
                <Text style={styles.removeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const FavoritesScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setFavorites(demoFavorites);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: FavoriteItem) => {
    const typeMap: Record<string, string> = {
      movie: 'vod',
      series: 'vod',
      channel: 'live',
      podcast: 'podcast',
      radio: 'radio',
    };
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: typeMap[item.type] || 'vod',
    });
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(prev => prev.filter(item => item.id !== id));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }]}>
          <Text style={styles.headerIconText}>⭐</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('favorites.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {favorites.length} {t('favorites.items')}
          </Text>
        </View>
      </View>

      {/* Content Grid */}
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <FavoriteCard
            item={item}
            onPress={() => handleItemPress(item)}
            onRemove={() => handleRemoveFavorite(item.id)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={[styles.emptyTitle, { textAlign }]}>{t('favorites.empty')}</Text>
              <Text style={[styles.emptySubtitle, { textAlign }]}>{t('favorites.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '16.66%' : '25%',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
    // @ts-ignore
    boxShadow: `0 0 20px ${colors.primary}`,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 14,
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: colors.background,
    marginLeft: 4,
  },
  removeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 18,
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default FavoritesScreen;
