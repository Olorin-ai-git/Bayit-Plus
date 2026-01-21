import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, TextInput, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Baby, Lock } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import { childrenService } from '../services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassCategoryPill, GlassModal } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import { useDirection } from '@/hooks/useDirection';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@/utils/logger';

const CATEGORY_ICONS: Record<string, string> = {
  all: '🌈',
  cartoons: '🎬',
  educational: '📚',
  music: '🎵',
  hebrew: 'א',
  stories: '📖',
  jewish: '✡️',
};

const SUBCATEGORY_ICONS: Record<string, string> = {
  'learning-hebrew': 'א',
  'young-science': '🔬',
  'math-fun': '🔢',
  'nature-animals': '🦁',
  'interactive': '🎮',
  'hebrew-songs': '🎶',
  'nursery-rhymes': '👶',
  'kids-movies': '🎬',
  'kids-series': '📺',
  'jewish-holidays': '🕎',
  'torah-stories': '📜',
  'bedtime-stories': '🌙',
};

const AGE_GROUP_ICONS: Record<string, string> = {
  toddlers: '👶',
  preschool: '🧒',
  elementary: '👧',
  preteen: '🧑',
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
  const categoryIcon = CATEGORY_ICONS[item.category || 'all'] || '🌈';

  return (
    <Link to={`/vod/${item.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <View className={`m-1 rounded-2xl overflow-hidden bg-yellow-400/10 ${isHovered ? 'scale-105' : ''}`}>
          <View className="aspect-video relative">
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full bg-yellow-400/10 justify-center items-center">
                <Text className="text-3xl">{categoryIcon}</Text>
              </View>
            )}
            <View className="absolute top-2 left-2 bg-yellow-400 px-2 py-1 rounded-full">
              <Text className="text-sm">{categoryIcon}</Text>
            </View>
            {item.age_rating !== undefined && (
              <View className="absolute top-2 right-2 bg-green-500/90 px-1.5 py-0.5 rounded-sm">
                <Text className="text-white text-xs font-bold">+{item.age_rating}</Text>
              </View>
            )}
            {item.duration && (
              <View className="absolute bottom-2 right-2 flex-row items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-sm">
                <Clock size={10} color={colors.text} />
                <Text className="text-white text-xs">{item.duration}</Text>
              </View>
            )}
            {isHovered && (
              <View className="absolute inset-0 bg-black/40 justify-center items-center">
                <View className="w-14 h-14 rounded-full bg-yellow-400 justify-center items-center">
                  <Play size={24} color="#854d0e" fill="#854d0e" />
                </View>
              </View>
            )}
          </View>
          <View className="p-2">
            <Text className="text-white text-lg font-semibold" numberOfLines={1}>{item.title}</Text>
            {item.description && (
              <Text className="text-gray-400 text-sm mt-1" numberOfLines={1}>{item.description}</Text>
            )}
            {item.educational_tags && item.educational_tags.length > 0 && (
              <View className="flex-row gap-1 mt-2">
                {item.educational_tags.slice(0, 2).map((tag) => (
                  <View key={tag} className="bg-purple-500/40 px-2 py-0.5 rounded-full">
                    <Text className="text-blue-300 text-xs">{tag}</Text>
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
      <View className="w-16 h-16 rounded-full bg-yellow-400/20 justify-center items-center self-center mb-4">
        <Lock size={32} color="#facc15" />
      </View>
      <Text className="text-gray-400 text-sm text-center mb-6">{t('children.exitDescription')}</Text>
      <TextInput
        value={pin}
        onChangeText={(text) => setPin(text.replace(/\D/g, ''))}
        maxLength={6}
        keyboardType="numeric"
        secureTextEntry
        className="bg-white/10 border border-white/20 rounded-lg p-4 text-white text-2xl text-center tracking-widest mb-4"
        autoFocus
      />
      {error && <Text className="text-red-500 text-sm text-center mb-4">{error}</Text>}
      <Pressable
        onPress={handleSubmit}
        disabled={pin.length < 4 || isLoading}
        className={`bg-yellow-400 py-4 rounded-lg items-center ${(pin.length < 4 || isLoading) ? 'opacity-50' : ''}`}
      >
        {isLoading ? (
          <ActivityIndicator color="#854d0e" />
        ) : (
          <Text className="text-yellow-900 text-base font-bold">{t('children.confirm')}</Text>
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
    <View className="flex-1 min-h-screen">
      <LinearGradient
        colors={['rgba(255, 217, 61, 0.05)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View className="flex-1 px-4 py-6 max-w-[1400px] mx-auto w-full">
        <View className={`flex-row items-center justify-between mb-6 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
          <View className={`flex-row items-center gap-4 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <View className="w-16 h-16 rounded-full bg-yellow-400/20 justify-center items-center">
              <Baby size={32} color="#facc15" />
            </View>
            <View>
              <Text className={`text-yellow-400 text-3xl font-bold ${textAlign === 'right' ? 'text-right' : ''}`}>{t('children.title')}</Text>
              <Text className={`text-gray-400 text-sm ${textAlign === 'right' ? 'text-right' : ''}`}>{content.length} {t('children.items')}</Text>
            </View>
          </View>
          {isKidsMode && isKidsMode() && (
            <Pressable onPress={() => setShowExitModal(true)} className="flex-row items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/20">
              <Lock size={16} color={colors.textMuted} />
              <Text className="text-gray-400 text-sm">{t('children.exitKidsMode')}</Text>
            </Pressable>
          )}
        </View>

        {/* Main Categories */}
        {categories.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-4">
            {categories.map((category) => (
              <GlassCategoryPill
                key={category.id}
                label={getLocalizedName(category, i18n.language)}
                emoji={CATEGORY_ICONS[category.id] || '🌈'}
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
          </View>
        )}

        {/* Subcategories (expandable) */}
        {showSubcategories && filteredSubcategories.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-4 px-2 py-2 bg-yellow-400/5 rounded-2xl">
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
          <View className="mb-6">
            <Text className="text-gray-400 text-sm font-semibold mb-2">{t('taxonomy.subcategories.ageGroups.title')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {ageGroups.map((group) => (
                <Pressable
                  key={group.slug}
                  className={`flex-row items-center gap-1 px-4 py-2 rounded-full bg-black/30 border ${selectedAgeGroup === group.slug ? 'bg-yellow-400/30 border-yellow-400' : 'border-white/20'}`}
                  onPress={() => handleAgeGroupSelect(selectedAgeGroup === group.slug ? '' : group.slug)}
                >
                  <Text className="text-sm">{AGE_GROUP_ICONS[group.slug] || '👤'}</Text>
                  <Text className={`text-xs ${selectedAgeGroup === group.slug ? 'text-yellow-400 font-semibold' : 'text-gray-400'}`}>
                    {getLocalizedName(group, i18n.language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {isLoading ? (
          <View className="flex-1 justify-center items-center py-16">
            <ActivityIndicator size="large" color="#facc15" />
          </View>
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
          <View className="flex-1 justify-center items-center py-16">
            <GlassCard className="p-6 items-center bg-yellow-400/10">
              <Text className="text-6xl mb-4">🌈</Text>
              <Text className="text-yellow-400 text-xl font-semibold mb-2">{t('children.noContent')}</Text>
              <Text className="text-gray-400 text-base">{t('children.tryAnotherCategory')}</Text>
            </GlassCard>
          </View>
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
