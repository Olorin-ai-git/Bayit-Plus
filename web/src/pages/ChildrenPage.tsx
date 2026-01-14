import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, TextInput, ActivityIndicator, Modal, useWindowDimensions } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Baby, Lock, X } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import { childrenService } from '../services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassView, GlassButton, GlassCategoryPill } from '@bayit/shared/ui';
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

interface KidsContentItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  age_rating?: number;
  duration?: string;
  educational_tags?: string[];
}

interface Category {
  id: string;
  name: string;
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
        <View style={[styles.kidsCard, isHovered && styles.kidsCardHovered]}>
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
                <Text style={styles.ageText}>+{item.age_rating}</Text>
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
                <View style={styles.playButtonYellow}>
                  <Play size={24} color="#854d0e" fill="#854d0e" />
                </View>
              </View>
            )}
          </View>
          <View style={styles.kidsInfo}>
            <Text style={styles.kidsTitle} numberOfLines={1}>{item.title}</Text>
            {item.description && (
              <Text style={styles.kidsDescription} numberOfLines={1}>{item.description}</Text>
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
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <GlassCard style={styles.modalCard}>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <X size={24} color={colors.textMuted} />
          </Pressable>
          <View style={styles.modalIcon}>
            <Lock size={32} color="#facc15" />
          </View>
          <Text style={styles.modalTitle}>{t('children.exitKidsMode')}</Text>
          <Text style={styles.modalSubtitle}>{t('children.exitDescription')}</Text>
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
              <ActivityIndicator color="#854d0e" />
            ) : (
              <Text style={styles.confirmButtonText}>{t('children.confirm')}</Text>
            )}
          </Pressable>
        </GlassCard>
      </View>
    </Modal>
  );
}

export default function ChildrenPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const navigate = useNavigate();
  const { activeProfile, isKidsMode } = useProfileStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [content, setContent] = useState<KidsContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadContent();
  }, [selectedCategory, activeProfile]);

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

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const maxAge = activeProfile?.is_kids_profile ? activeProfile.kids_age_limit : undefined;
      const response = await childrenService.getContent(category, maxAge);
      if (response?.data && Array.isArray(response.data)) {
        setContent(response.data);
      }
    } catch (err) {
      logger.error('Failed to load kids content', 'ChildrenPage', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

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
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={[styles.header, { flexDirection, justifyContent }]}>
          <View style={[styles.headerLeft, { flexDirection, justifyContent }]}>
            <View style={styles.headerIcon}>
              <Baby size={32} color="#facc15" />
            </View>
            <View>
              <Text style={[styles.pageTitle, { textAlign }]}>{t('children.title')}</Text>
              <Text style={[styles.itemCount, { textAlign }]}>{content.length} {t('children.items')}</Text>
            </View>
          </View>
          {isKidsMode && isKidsMode() && (
            <Pressable onPress={() => setShowExitModal(true)} style={styles.exitButton}>
              <Lock size={16} color={colors.textMuted} />
              <Text style={styles.exitButtonText}>{t('children.exitKidsMode')}</Text>
            </Pressable>
          )}
        </View>

        {categories.length > 0 && (
          <View style={styles.categories}>
            {categories.map((category) => (
              <GlassCategoryPill
                key={category.id}
                label={getLocalizedName(category, i18n.language)}
                emoji={CATEGORY_ICONS[category.id] || '🌈'}
                isActive={selectedCategory === category.id}
                onPress={() => setSelectedCategory(category.id)}
              />
            ))}
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#facc15" />
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
                <KidsContentCard item={item} />
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🌈</Text>
              <Text style={styles.emptyTitle}>{t('children.noContent')}</Text>
              <Text style={styles.emptyDescription}>{t('children.tryAnotherCategory')}</Text>
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
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#facc15',
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
    marginBottom: spacing.lg,
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
  kidsCard: {
    margin: spacing.xs,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
  },
  kidsCardHovered: {
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
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
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
    backgroundColor: '#facc15',
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
  playButtonYellow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#facc15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kidsInfo: {
    padding: spacing.sm,
  },
  kidsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  kidsDescription: {
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
    color: '#93c5fd',
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
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#facc15',
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textMuted,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 384,
    padding: spacing.lg,
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
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
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmButton: {
    backgroundColor: '#facc15',
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
    color: '#854d0e',
  },
});
