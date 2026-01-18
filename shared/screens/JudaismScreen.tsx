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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassCategoryPill } from '../components/ui';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';
import { judaismService } from '../services/api';
import { JerusalemRow } from '../components/JerusalemRow';
import { TelAvivRow } from '../components/TelAvivRow';

interface JudaismItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'shiur' | 'prayer' | 'music' | 'documentary' | 'lecture' | 'holiday';
  duration?: string;
  rabbi?: string;
  rabbi_en?: string;
  rabbi_es?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  icon: string;
}

const TYPE_ICONS: Record<string, string> = {
  shiur: '📖',
  prayer: '🕯️',
  music: '🎵',
  documentary: '🎬',
  lecture: '🎓',
  holiday: '🕎',
};

const JudaismCard: React.FC<{
  item: JudaismItem;
  onPress: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, index, getLocalizedText }) => {
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
            <Text style={styles.placeholderIcon}>{TYPE_ICONS[item.type] || '✡️'}</Text>
          </View>
        )}
        <View style={[styles.typeBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <Text style={styles.typeBadgeText}>{TYPE_ICONS[item.type]}</Text>
        </View>
        {item.duration && (
          <View style={[styles.durationBadge, isRTL ? { right: 8 } : { left: 8 }]}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.rabbi && (
            <Text style={[styles.cardRabbi, { textAlign }]} numberOfLines={1}>
              {getLocalizedText(item, 'rabbi')}
            </Text>
          )}
          {item.subtitle && (
            <Text style={[styles.cardSubtitle, { textAlign }]} numberOfLines={1}>
              {getLocalizedText(item, 'subtitle')}
            </Text>
          )}
        </View>
        {isFocused && (
          <View style={styles.overlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const JudaismScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<JudaismItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const currentLang = i18n.language;

  const getLocalizedText = (item: any, field: string) => {
    if (field === 'title') return getLocalizedName(item, currentLang);
    if (field === 'description') return getLocalizedDescription(item, currentLang);
    // Fallback for other fields
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await judaismService.getCategories();
      // Response is already unwrapped by axios interceptor
      if (response?.categories && Array.isArray(response.categories)) {
        setCategories(response.categories);
      }
    } catch (err) {
      console.error('Failed to load Judaism categories:', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const response = await judaismService.getContent(category);
      // Response is already unwrapped by axios interceptor
      if (response?.content && Array.isArray(response.content)) {
        setContent(response.content);
      }
    } catch (err) {
      console.error('Failed to load Judaism content:', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: JudaismItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.type === 'music' ? 'radio' : 'vod',
    });
  };

  if (isLoading && content.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }]}>
          <Text style={styles.headerIconText}>✡️</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('judaism.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {content.length} {t('judaism.items')}
          </Text>
        </View>
      </View>

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categories, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
        >
          {(isRTL ? categories : [...categories].reverse()).map((category, index) => (
            <GlassCategoryPill
              key={category.id}
              label={getLocalizedText(category, 'name')}
              emoji={category.icon}
              isActive={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              hasTVPreferredFocus={index === 0}
            />
          ))}
        </ScrollView>
      )}

      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 5 : 3}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={
          <View>
            <View style={styles.jerusalemSection}>
              <JerusalemRow showTitle={false} />
            </View>
            <View style={styles.telAvivSection}>
              <TelAvivRow showTitle={false} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <JudaismCard
            item={item}
            onPress={() => handleItemPress(item)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✡️</Text>
              <Text style={[styles.emptyTitle, { textAlign }]}>{t('judaism.empty')}</Text>
              <Text style={[styles.emptySubtitle, { textAlign }]}>{t('judaism.emptyHint')}</Text>
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
    backgroundColor: colors.glassPurple,
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
  categories: {
    paddingHorizontal: 48,
    marginBottom: 24,
    gap: 12,
  },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '20%' : '33.33%',
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
    fontSize: 48,
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
  durationBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardRabbi: {
    fontSize: 12,
    color: colors.primaryLight,
    marginTop: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: colors.text,
    marginLeft: 4,
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
  jerusalemSection: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.md,
  },
  telAvivSection: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.md,
  },
});

export default JudaismScreen;
