import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, TextInput, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Users, Lock, TrendingUp, Newspaper } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import { youngstersService } from '../services/api';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassCategoryPill, GlassModal } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import { useDirection } from '@/hooks/useDirection';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@/utils/logger';

const CATEGORY_ICONS: Record<string, string> = {
  all: '🎯',
  trending: '🔥',
  news: '📰',
  culture: '🎭',
  educational: '📚',
  music: '🎵',
  entertainment: '🎬',
  sports: '⚽',
  tech: '💻',
  judaism: '✡️',
};

const SUBCATEGORY_ICONS: Record<string, string> = {
  'tiktok-trends': '📱',
  'viral-videos': '🔥',
  'memes': '😂',
  'israel-news': '🇮🇱',
  'world-news': '🌍',
  'science-news': '🔬',
  'sports-news': '⚽',
  'music-culture': '🎵',
  'film-culture': '🎬',
  'art-culture': '🎨',
  'food-culture': '🍕',
  'study-help': '📖',
  'career-prep': '💼',
  'life-skills': '🛠️',
  'teen-movies': '🍿',
  'teen-series': '📺',
  'gaming': '🎮',
  'coding': '💻',
  'gadgets': '📱',
  'bar-bat-mitzvah': '🎉',
  'teen-torah': '📜',
  'jewish-history': '🕎',
};

const AGE_GROUP_ICONS: Record<string, string> = {
  'middle-school': '🧑',
  'high-school': '👨',
};

interface YoungstersContentItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  subcategory?: string;
  age_group?: string;
  age_rating?: number;
  duration?: string;
  educational_tags?: string[];
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  slug: string;
  name: string;
  name_en?: string;
  icon?: string;
  parent_category: string;
  content_count: number;
}

interface AgeGroup {
  id: string;
  slug: string;
  name: string;
  name_en?: string;
  min_age: number;
  max_age: number;
  content_count: number;
}

function YoungstersContentCard({ item }: { item: YoungstersContentItem }) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryIcon = CATEGORY_ICONS[item.category || 'all'] || '🎯';

  return (
    <Link to={`/vod/${item.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <View style={[styles.youngCard, isHovered && styles.youngCardHovered]}>
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.placeholderIcon}>{categoryIcon}</Text>
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            </View>
            {item.age_rating !== undefined && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageText}>{item.age_rating}+</Text>
              </View>
            )}
            {item.duration && (
              <View style={styles.durationBadge}>
                <Clock size={10} color={colors.text} />
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            )}
            {isHovered && (
              <View style={styles.hoverOverlay}>
                <View style={styles.playButtonPurple}>
                  <Play size={24} color="#581c87" fill="#581c87" />
                </View>
              </View>
            )}
          </View>
          <View style={styles.youngInfo}>
            <Text style={styles.youngTitle} numberOfLines={1}>{item.title}</Text>
            {item.description && (
              <Text style={styles.youngDescription} numberOfLines={1}>{item.description}</Text>
            )}
            {item.educational_tags && item.educational_tags.length > 0 && (
              <View style={styles.tagsRow}>
                {item.educational_tags.slice(0, 2).map((tag) => (
                  <View key={tag} style={styles.eduTag}>
                    <Text style={styles.eduTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function ExitYoungstersModeModal({ isOpen, onClose, onVerify }: { isOpen: boolean; onClose: () => void; onVerify: (pin: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (pin.length < 4) return;
    setIsLoading(true);
    setError('');
    try {
      await onVerify(pin);
      onClose();
    } catch (err: any) {
      setError(err.message || t('youngsters.wrongCode'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassModal
      visible={isOpen}
      title={t('youngsters.exitYoungstersMode')}
      onClose={onClose}
      dismissable={true}
    >
      <View style={styles.modalIcon}>
        <Lock size={32} color="#a855f7" />
      </View>
      <Text style={styles.modalSubtitle}>{t('youngsters.exitDescription')}</Text>
      <TextInput
        value={pin}
        onChangeText={(text) => setPin(text.replace(/\D/g, ''))}
        maxLength={6}
        keyboardType="numeric"
        secureTextEntry
        style={styles.pinInput}
        autoFocus
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Pressable
        onPress={handleSubmit}
        disabled={pin.length < 4 || isLoading}
        style={[styles.confirmButton, (pin.length < 4 || isLoading) && styles.buttonDisabled]}
      >
        {isLoading ? (
          <ActivityIndicator color="#581c87" />
        ) : (
          <Text style={styles.confirmButtonText}>{t('youngsters.confirm')}</Text>
        )}
      </Pressable>
    </GlassModal>
  );
}

export default function YoungstersPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const navigate = useNavigate();
  const { activeProfile } = useProfileStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);
  const [content, setContent] = useState<YoungstersContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadCategories();
    loadSubcategories();
    loadAgeGroups();
  }, []);

  useEffect(() => {
    loadContent();
  }, [selectedCategory, selectedSubcategory, selectedAgeGroup, activeProfile]);

  const loadCategories = async () => {
    try {
      const response = await youngstersService.getCategories();
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (err) {
      logger.error('Failed to load youngsters categories', 'YoungstersPage', err);
    }
  };

  const loadSubcategories = async () => {
    try {
      const response = await youngstersService.getSubcategories();
      if (response?.subcategories && Array.isArray(response.subcategories)) {
        setSubcategories(response.subcategories);
      }
    } catch (err) {
      logger.error('Failed to load youngsters subcategories', 'YoungstersPage', err);
    }
  };

  const loadAgeGroups = async () => {
    try {
      const response = await youngstersService.getAgeGroups();
      if (response?.age_groups && Array.isArray(response.age_groups)) {
        setAgeGroups(response.age_groups);
      }
    } catch (err) {
      logger.error('Failed to load age groups', 'YoungstersPage', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const maxAge = activeProfile?.youngsters_age_limit || 17;

      let response;
      if (selectedSubcategory) {
        response = await youngstersService.getContentBySubcategory(selectedSubcategory, maxAge);
      } else if (selectedAgeGroup) {
        response = await youngstersService.getContentByAgeGroup(selectedAgeGroup);
      } else {
        const category = selectedCategory !== 'all' ? selectedCategory : undefined;
        response = await youngstersService.getContent(category, maxAge);
      }

      if (response?.items && Array.isArray(response.items)) {
        setContent(response.items);
      } else if (response?.data && Array.isArray(response.data)) {
        setContent(response.data);
      } else {
        setContent([]);
      }
    } catch (err) {
      logger.error('Failed to load youngsters content', 'YoungstersPage', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setSelectedAgeGroup(null);
    setShowSubcategories(false);
  };

  const handleSubcategorySelect = (subcategorySlug: string) => {
    setSelectedSubcategory(subcategorySlug);
    setSelectedCategory('all');
    setSelectedAgeGroup(null);
  };

  const handleAgeGroupSelect = (ageGroupSlug: string) => {
    setSelectedAgeGroup(ageGroupSlug);
    setSelectedSubcategory(null);
  };

  // Filter subcategories by selected category
  const filteredSubcategories = selectedCategory !== 'all'
    ? subcategories.filter(s => s.parent_category === selectedCategory)
    : subcategories;

  const handleExitYoungstersMode = async (pin: string) => {
    try {
      await youngstersService.verifyPin(pin);
      navigate('/');
    } catch (err) {
      throw new Error(t('youngsters.wrongCode'));
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168, 85, 247, 0.05)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={[styles.header, { flexDirection, justifyContent }]}>
          <View style={[styles.headerLeft, { flexDirection, justifyContent }]}>
            <View style={styles.headerIcon}>
              <Users size={32} color="#a855f7" />
            </View>
            <View>
              <Text style={[styles.pageTitle, { textAlign }]}>{t('youngsters.title')}</Text>
              <Text style={[styles.itemCount, { textAlign }]}>{content.length} {t('youngsters.items')}</Text>
            </View>
          </View>
          <Pressable onPress={() => setShowExitModal(true)} style={styles.exitButton}>
            <Lock size={16} color={colors.textMuted} />
            <Text style={styles.exitButtonText}>{t('youngsters.exitYoungstersMode')}</Text>
          </Pressable>
        </View>

        {/* Main Categories */}
        {categories.length > 0 && (
          <View style={styles.categories}>
            {categories.map((category) => (
              <GlassCategoryPill
                key={category.id}
                label={getLocalizedName(category, i18n.language)}
                emoji={CATEGORY_ICONS[category.id] || '🎯'}
                isActive={selectedCategory === category.id && !selectedSubcategory && !selectedAgeGroup}
                onPress={() => handleCategorySelect(category.id)}
              />
            ))}
            <GlassCategoryPill
              label={t('taxonomy.subcategories.title')}
              emoji="📂"
              isActive={showSubcategories}
              onPress={() => setShowSubcategories(!showSubcategories)}
            />
            <GlassCategoryPill
              label={t('youngsters.trending')}
              emoji="🔥"
              isActive={showTrending}
              onPress={() => setShowTrending(!showTrending)}
            />
            <GlassCategoryPill
              label={t('youngsters.news')}
              emoji="📰"
              isActive={showNews}
              onPress={() => setShowNews(!showNews)}
            />
          </View>
        )}

        {/* Subcategories (expandable) */}
        {showSubcategories && filteredSubcategories.length > 0 && (
          <View style={styles.subcategories}>
            {filteredSubcategories.map((subcategory) => (
              <GlassCategoryPill
                key={subcategory.slug}
                label={getLocalizedName(subcategory, i18n.language)}
                emoji={SUBCATEGORY_ICONS[subcategory.slug] || '📁'}
                isActive={selectedSubcategory === subcategory.slug}
                onPress={() => handleSubcategorySelect(subcategory.slug)}
              />
            ))}
          </View>
        )}

        {/* Age Group Filter */}
        {ageGroups.length > 0 && (
          <View style={styles.ageGroups}>
            <Text style={styles.filterLabel}>{t('taxonomy.subcategories.ageGroups.title')}</Text>
            <View style={styles.ageGroupPills}>
              {ageGroups.map((group) => (
                <Pressable
                  key={group.slug}
                  style={[
                    styles.ageGroupPill,
                    selectedAgeGroup === group.slug && styles.ageGroupPillActive
                  ]}
                  onPress={() => handleAgeGroupSelect(selectedAgeGroup === group.slug ? '' : group.slug)}
                >
                  <Text style={styles.ageGroupEmoji}>{AGE_GROUP_ICONS[group.slug] || '👤'}</Text>
                  <Text style={[
                    styles.ageGroupText,
                    selectedAgeGroup === group.slug && styles.ageGroupTextActive
                  ]}>
                    {getLocalizedName(group, i18n.language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#a855f7" />
          </View>
        ) : content.length > 0 ? (
          <FlatList
            data={content}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
            renderItem={({ item }) => (
              <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
                <YoungstersContentCard item={item} />
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyTitle}>{t('youngsters.noContent')}</Text>
              <Text style={styles.emptyDescription}>{t('youngsters.tryAnotherCategory')}</Text>
            </GlassCard>
          </View>
        )}
      </View>

      <ExitYoungstersModeModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onVerify={handleExitYoungstersMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh' as any,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#a855f7',
  },
  itemCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLighter,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  exitButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  subcategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderRadius: borderRadius.lg,
  },
  ageGroups: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  ageGroupPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ageGroupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  ageGroupPillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderColor: '#a855f7',
  },
  ageGroupEmoji: {
    fontSize: 14,
  },
  ageGroupText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  ageGroupTextActive: {
    color: '#a855f7',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  gridContent: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  youngCard: {
    margin: spacing.xs,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  youngCardHovered: {
    transform: [{ scale: 1.02 }],
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: '#a855f7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryIcon: {
    fontSize: 14,
  },
  ageBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ageText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: 10,
    color: colors.text,
  },
  hoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPurple: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youngInfo: {
    padding: spacing.sm,
  },
  youngTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  youngDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  eduTag: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  eduTagText: {
    fontSize: 12,
    color: '#c4b5fd',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#a855f7',
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textMuted,
  },
  // Modal styles
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  pinInput: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmButton: {
    backgroundColor: '#a855f7',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#581c87',
  },
});
