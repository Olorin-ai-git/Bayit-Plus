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

interface DownloadItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'episode' | 'podcast';
  size: string;
  downloadedAt: string;
  status: 'completed' | 'downloading' | 'paused';
  progress?: number;
}

// Demo downloads data with localization
const demoDownloads: DownloadItem[] = [
  {
    id: 'dl-1',
    title: 'פאודה - עונה 4 פרק 1',
    title_en: 'Fauda - Season 4 Episode 1',
    title_es: 'Fauda - Temporada 4 Episodio 1',
    subtitle: 'פרק ראשון של העונה החדשה',
    subtitle_en: 'First episode of the new season',
    subtitle_es: 'Primer episodio de la nueva temporada',
    thumbnail: 'https://picsum.photos/seed/fauda-ep1/400/225',
    type: 'episode',
    size: '1.2 GB',
    downloadedAt: '2024-01-15',
    status: 'completed',
  },
  {
    id: 'dl-2',
    title: 'שטיסל - עונה 3 פרק 5',
    title_en: 'Shtisel - Season 3 Episode 5',
    title_es: 'Shtisel - Temporada 3 Episodio 5',
    subtitle: 'סוד משפחתי נחשף',
    subtitle_en: 'A family secret revealed',
    subtitle_es: 'Un secreto familiar revelado',
    thumbnail: 'https://picsum.photos/seed/shtisel-ep5/400/225',
    type: 'episode',
    size: '980 MB',
    downloadedAt: '2024-01-12',
    status: 'completed',
  },
  {
    id: 'dl-3',
    title: 'וואלה',
    title_en: 'Waltz with Bashir',
    title_es: 'Vals con Bashir',
    subtitle: 'סרט אנימציה דוקומנטרי',
    subtitle_en: 'Animated documentary film',
    subtitle_es: 'Pelicula documental animada',
    thumbnail: 'https://picsum.photos/seed/waltz/400/225',
    type: 'movie',
    size: '2.4 GB',
    downloadedAt: '2024-01-10',
    status: 'completed',
  },
  {
    id: 'dl-4',
    title: 'עושים היסטוריה - פרק 42',
    title_en: 'Making History - Episode 42',
    title_es: 'Haciendo Historia - Episodio 42',
    subtitle: 'מלחמת ששת הימים',
    subtitle_en: 'The Six-Day War',
    subtitle_es: 'La Guerra de los Seis Dias',
    thumbnail: 'https://picsum.photos/seed/history-42/400/225',
    type: 'podcast',
    size: '85 MB',
    downloadedAt: '2024-01-08',
    status: 'completed',
  },
  {
    id: 'dl-5',
    title: 'טהרן - עונה 2 פרק 3',
    title_en: 'Tehran - Season 2 Episode 3',
    title_es: 'Teheran - Temporada 2 Episodio 3',
    subtitle: 'מתח בעיר הקודש',
    subtitle_en: 'Tension in the holy city',
    subtitle_es: 'Tension en la ciudad santa',
    thumbnail: 'https://picsum.photos/seed/tehran-ep3/400/225',
    type: 'episode',
    size: '1.1 GB',
    downloadedAt: '2024-01-05',
    status: 'downloading',
    progress: 65,
  },
];

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  episode: '📺',
  podcast: '🎙️',
};

const DownloadCard: React.FC<{
  item: DownloadItem;
  onPress: () => void;
  onDelete: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, onDelete, index, getLocalizedText }) => {
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
            <Text style={styles.placeholderIcon}>{TYPE_ICONS[item.type] || '⬇️'}</Text>
          </View>
        )}

        {/* Progress bar for downloading items */}
        {item.status === 'downloading' && item.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          </View>
        )}

        <View style={[styles.typeBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <Text style={styles.typeBadgeText}>{TYPE_ICONS[item.type]}</Text>
        </View>

        <View style={[styles.sizeBadge, isRTL ? { right: 8 } : { left: 8 }]}>
          <Text style={styles.sizeBadgeText}>{item.size}</Text>
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
          {item.status === 'downloading' && (
            <View style={[styles.statusRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
              <Text style={styles.statusText}>{item.progress}%</Text>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>

        {isFocused && (
          <View style={styles.overlay}>
            <View style={styles.overlayButtons}>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
              <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const DownloadsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  // Calculate total size
  const getTotalSize = () => {
    let totalMB = 0;
    downloads.forEach(item => {
      const sizeStr = item.size.toUpperCase();
      if (sizeStr.includes('GB')) {
        totalMB += parseFloat(sizeStr) * 1024;
      } else if (sizeStr.includes('MB')) {
        totalMB += parseFloat(sizeStr);
      }
    });
    if (totalMB >= 1024) {
      return `${(totalMB / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(totalMB)} MB`;
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setDownloads(demoDownloads);
    } catch (err) {
      console.error('Failed to load downloads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: DownloadItem) => {
    if (item.status !== 'completed') return;

    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.type === 'podcast' ? 'podcast' : 'vod',
    });
  };

  const handleDeleteDownload = (id: string) => {
    setDownloads(prev => prev.filter(item => item.id !== id));
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
          <Text style={styles.headerIconText}>⬇️</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('downloads.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {downloads.length} {t('downloads.items')} • {getTotalSize()}
          </Text>
        </View>
      </View>

      {/* Storage info */}
      <View style={[styles.storageInfo, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <Text style={styles.storageLabel}>{t('downloads.storage')}</Text>
        <View style={styles.storageBarContainer}>
          <View style={[styles.storageBar, { width: '35%' }]} />
        </View>
        <Text style={styles.storageText}>12.5 GB / 32 GB</Text>
      </View>

      {/* Content Grid */}
      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <DownloadCard
            item={item}
            onPress={() => handleItemPress(item)}
            onDelete={() => handleDeleteDownload(item.id)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⬇️</Text>
              <Text style={[styles.emptyTitle, { textAlign }]}>{t('downloads.empty')}</Text>
              <Text style={[styles.emptySubtitle, { textAlign }]}>{t('downloads.emptyHint')}</Text>
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
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
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
  storageInfo: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  storageLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  storageBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundLighter,
    borderRadius: 4,
    overflow: 'hidden',
  },
  storageBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  storageText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
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
  progressContainer: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
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
  sizeBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sizeBadgeText: {
    fontSize: 10,
    color: colors.background,
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
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    marginTop: 4,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
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
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 100, 100, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 18,
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

export default DownloadsScreen;
