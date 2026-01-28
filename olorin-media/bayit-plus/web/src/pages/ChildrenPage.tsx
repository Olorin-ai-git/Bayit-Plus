import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, TextInput, ActivityIndicator, useWindowDimensions, StyleSheet } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Baby, Lock } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import { childrenService } from '../services/api';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import {
  GlassCard,
  GlassButton,
  GlassCategoryPill,
  GlassModal,
  GlassPageHeader,
  GridSkeleton,
  GlassContentPlaceholder,
} from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import { useDirection } from '@/hooks/useDirection';
import { LoadingState, EmptyState } from '@bayit/shared/components/states';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@/utils/logger';

const CATEGORY_ICON_NAMES: Record<string, string> = {
  all: 'discover',
  cartoons: 'vod',
  educational: 'info',
  music: 'podcasts',
  hebrew: 'info',
  stories: 'info',
  jewish: 'judaism',
};

const SUBCATEGORY_ICON_NAMES: Record<string, string> = {
  'learning-hebrew': 'info',
  'young-science': 'info',
  'math-fun': 'info',
  'nature-animals': 'discover',
  'interactive': 'discover',
  'hebrew-songs': 'podcasts',
  'nursery-rhymes': 'info',
  'kids-movies': 'vod',
  'kids-series': 'vod',
  'jewish-holidays': 'judaism',
  'torah-stories': 'judaism',
  'bedtime-stories': 'discover',
};

const AGE_GROUP_ICON_NAMES: Record<string, string> = {
  toddlers: 'discover',
  preschool: 'discover',
  elementary: 'discover',
  preteen: 'discover',
};

interface KidsContentItem {
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

function KidsContentCard({ item }: { item: KidsContentItem }) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryIconName = CATEGORY_ICON_NAMES[item.category || 'all'] || 'discover';

  return (
    <Link to={`/vod/${item.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <View style={[styles.contentCard, isHovered && styles.contentCardHovered]}>
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <GlassContentPlaceholder
                type="generic"
                aspectRatio="16:9"
                size="medium"
                icon={<NativeIcon name={categoryIconName} size="xl" color={colors.textMuted} />}
                label={item.category || 'Kids'}
              />
            )}
            <View style={styles.categoryBadge}>
              <NativeIcon name={categoryIconName} size="sm" color="#713f12" />
            </View>
            {item.age_rating !== undefined && (
              <View style={styles.ageRatingBadge}>
                <Text style={styles.ageRatingText}>+{item.age_rating}</Text>
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
                <View style={styles.playButton}>
                  <Play size={24} color="#854d0e" fill="#854d0e" />
                </View>
              </View>
            )}
          </View>
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle} numberOfLines={1}>{item.title}</Text>
            {item.description && (
              <Text style={styles.contentDescription} numberOfLines={1}>{item.description}</Text>
            )}
            {item.educational_tags && item.educational_tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.educational_tags.slice(0, 2).map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
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

function ExitKidsModeModal({ isOpen, onClose, onVerify }: { isOpen: boolean; onClose: () => void; onVerify: (pin: string) => Promise<void> }) {
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
      setError(err.message || t('children.wrongCode'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassModal
      visible={isOpen}
      title={t('children.exitKidsMode')}
      onClose={onClose}
      dismissable={true}
    >
      <View style={styles.modalIconContainer}>
        <Lock size={32} color="#facc15" />
      </View>
      <Text style={styles.modalDescription}>{t('children.exitDescription')}</Text>
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
        style={[styles.confirmButton, (pin.length < 4 || isLoading) && styles.confirmButtonDisabled]}
      >
        {isLoading ? (
          <ActivityIndicator color="#854d0e" />
        ) : (
          <Text style={styles.confirmButtonText}>{t('children.confirm')}</Text>
        )}
      </Pressable>
    </GlassModal>
  );
}

export default function ChildrenPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const navigate = useNavigate();
  const { activeProfile, isKidsMode } = useProfileStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);
  const [content, setContent] = useState<KidsContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
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
      const response = await childrenService.getCategories();
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (err) {
      logger.error('Failed to load children categories', 'ChildrenPage', err);
    }
  };

  const loadSubcategories = async () => {
    try {
      const response = await childrenService.getSubcategories();
      if (response?.subcategories && Array.isArray(response.subcategories)) {
        setSubcategories(response.subcategories);
      }
    } catch (err) {
      logger.error('Failed to load children subcategories', 'ChildrenPage', err);
    }
  };

  const loadAgeGroups = async () => {
    try {
      const response = await childrenService.getAgeGroups();
      if (response?.age_groups && Array.isArray(response.age_groups)) {
        setAgeGroups(response.age_groups);
      }
    } catch (err) {
      logger.error('Failed to load age groups', 'ChildrenPage', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const maxAge = activeProfile?.is_kids_profile ? activeProfile.kids_age_limit : undefined;

      let response;
      if (selectedSubcategory) {
        response = await childrenService.getContentBySubcategory(selectedSubcategory, maxAge);
      } else if (selectedAgeGroup) {
        response = await childrenService.getContentByAgeGroup(selectedAgeGroup);
      } else {
        const category = selectedCategory !== 'all' ? selectedCategory : undefined;
        response = await childrenService.getContent(category, maxAge);
      }

      if (response?.items && Array.isArray(response.items)) {
        setContent(response.items);
      } else if (response?.data && Array.isArray(response.data)) {
        setContent(response.data);
      } else {
        setContent([]);
      }
    } catch (err) {
      logger.error('Failed to load kids content', 'ChildrenPage', err);
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

  const handleExitKidsMode = async (pin: string) => {
    try {
      await childrenService.verifyPin(pin);
      navigate('/');
    } catch (err) {
      throw new Error(t('children.wrongCode'));
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 217, 61, 0.05)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <View style={[styles.header, flexDirection === 'row-reverse' && styles.headerReversed]}>
          <GlassPageHeader
            title={t('children.title')}
            pageType="kids"
            badge={content.length}
            isRTL={flexDirection === 'row-reverse'}
            style={styles.pageHeader}
          />
          {isKidsMode && isKidsMode() && (
            <Pressable onPress={() => setShowExitModal(true)} style={styles.exitButton}>
              <Lock size={16} color={colors.textMuted} />
              <Text style={styles.exitButtonText}>{t('children.exitKidsMode')}</Text>
            </Pressable>
          )}
        </View>

        {/* Main Categories */}
        {categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            {categories.map((category) => {
              const iconName = CATEGORY_ICON_NAMES[category.id] || 'discover';
              const isActive = selectedCategory === category.id && !selectedSubcategory && !selectedAgeGroup;
              return (
                <GlassCategoryPill
                  key={category.id}
                  label={getLocalizedName(category, i18n.language)}
                  icon={<NativeIcon name={iconName} size="sm" color={isActive ? colors.primary : colors.textMuted} />}
                  isActive={isActive}
                  onPress={() => handleCategorySelect(category.id)}
                />
              );
            })}
            <GlassCategoryPill
              label={t('taxonomy.subcategories.title')}
              icon={<NativeIcon name="discover" size="sm" color={showSubcategories ? colors.primary : colors.textMuted} />}
              isActive={showSubcategories}
              onPress={() => setShowSubcategories(!showSubcategories)}
            />
          </View>
        )}

        {/* Subcategories (expandable) */}
        {showSubcategories && filteredSubcategories.length > 0 && (
          <View style={styles.subcategoriesContainer}>
            {filteredSubcategories.map((subcategory) => {
              const iconName = SUBCATEGORY_ICON_NAMES[subcategory.slug] || 'discover';
              const isActive = selectedSubcategory === subcategory.slug;
              return (
                <GlassCategoryPill
                  key={subcategory.slug}
                  label={getLocalizedName(subcategory, i18n.language)}
                  icon={<NativeIcon name={iconName} size="sm" color={isActive ? colors.primary : colors.textMuted} />}
                  isActive={isActive}
                  onPress={() => handleSubcategorySelect(subcategory.slug)}
                />
              );
            })}
          </View>
        )}

        {/* Age Group Filter */}
        {ageGroups.length > 0 && (
          <View style={styles.ageGroupSection}>
            <Text style={styles.ageGroupTitle}>{t('taxonomy.subcategories.ageGroups.title')}</Text>
            <View style={styles.ageGroupsContainer}>
              {ageGroups.map((group) => {
                const isActive = selectedAgeGroup === group.slug;
                const iconName = AGE_GROUP_ICON_NAMES[group.slug] || 'discover';
                return (
                  <Pressable
                    key={group.slug}
                    style={[
                      styles.ageGroupButton,
                      isActive && styles.ageGroupButtonActive
                    ]}
                    onPress={() => handleAgeGroupSelect(isActive ? '' : group.slug)}
                  >
                    <NativeIcon name={iconName} size="sm" color={isActive ? '#facc15' : colors.textMuted} />
                    <Text style={[
                      styles.ageGroupText,
                      isActive && styles.ageGroupTextActive
                    ]}>
                      {getLocalizedName(group, i18n.language)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {isLoading ? (
          <>
            <View style={styles.categoriesSkeleton} />
            <GridSkeleton numColumns={numColumns} numRows={2} />
          </>
        ) : content.length > 0 ? (
          <FlatList
            data={content}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={{ gap: spacing.md }}
            columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
            renderItem={({ item }) => (
              <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
                <KidsContentCard item={item} />
              </View>
            )}
          />
        ) : (
          <EmptyState
            icon={<NativeIcon name="discover" size="xl" color="#facc15" />}
            title={t('children.noContent')}
            description={t('children.tryAnotherCategory')}
            titleColor="#facc15"
            backgroundColor="rgba(250, 204, 21, 0.1)"
          />
        )}
      </View>

      <ExitKidsModeModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onVerify={handleExitKidsMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    minHeight: '100vh' as any,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: 1400,
    marginHorizontal: 'auto' as any,
    width: '100%',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerReversed: {
    flexDirection: 'row-reverse',
  },
  pageHeader: {
    flex: 1,
    marginBottom: 0,
  },
  categoriesSkeleton: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  exitButtonText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  // Categories
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Subcategories
  subcategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(250, 204, 21, 0.05)',
    borderRadius: borderRadius.xl,
  },

  // Age Groups
  ageGroupSection: {
    marginBottom: spacing.xl,
  },
  ageGroupTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  ageGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ageGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ageGroupButtonActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.3)',
    borderColor: '#facc15',
  },
  ageGroupIcon: {
    fontSize: 14,
  },
  ageGroupText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  ageGroupTextActive: {
    color: '#facc15',
    fontWeight: '600',
  },

  // Content Card
  contentCard: {
    margin: 4,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
  },
  contentCardHovered: {
    transform: [{ scale: 1.05 }],
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
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconLarge: {
    fontSize: 48,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: '#facc15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 100,
  },
  categoryBadgeText: {
    fontSize: 14,
  },
  ageRatingBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  ageRatingText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
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
    borderRadius: borderRadius.xs,
  },
  durationText: {
    color: colors.text,
    fontSize: 12,
  },
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#facc15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    padding: spacing.sm,
  },
  contentTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  contentDescription: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
  },
  tag: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  tagText: {
    color: '#93c5fd',
    fontSize: 12,
  },

  // Modal
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalDescription: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  pinInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmButton: {
    backgroundColor: '#facc15',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#713f12',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: '#facc15',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
