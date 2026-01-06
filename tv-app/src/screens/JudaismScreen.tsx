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
import { GlassView } from '../components/ui';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

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

// Demo Judaism categories
const judaismCategories: Category[] = [
  { id: 'all', name: 'הכל', name_en: 'All', name_es: 'Todo', icon: '✡️' },
  { id: 'shiurim', name: 'שיעורים', name_en: 'Torah Classes', name_es: 'Clases de Tora', icon: '📖' },
  { id: 'tefila', name: 'תפילה', name_en: 'Prayer', name_es: 'Oracion', icon: '🕯️' },
  { id: 'music', name: 'מוזיקה יהודית', name_en: 'Jewish Music', name_es: 'Musica Judia', icon: '🎵' },
  { id: 'holidays', name: 'חגים', name_en: 'Holidays', name_es: 'Festividades', icon: '🕎' },
  { id: 'documentaries', name: 'סרטים תיעודיים', name_en: 'Documentaries', name_es: 'Documentales', icon: '🎬' },
];

// Demo Judaism content
const demoJudaismContent: JudaismItem[] = [
  {
    id: 'jud-1',
    title: 'פרשת השבוע',
    title_en: 'Weekly Torah Portion',
    title_es: 'Porcion Semanal de la Tora',
    subtitle: 'שיעור מעמיק בפרשה',
    subtitle_en: 'In-depth Torah lesson',
    subtitle_es: 'Leccion profunda de la Tora',
    thumbnail: 'https://picsum.photos/seed/torah1/400/225',
    type: 'shiur',
    duration: '45:00',
    rabbi: 'הרב יוסף כהן',
    rabbi_en: 'Rabbi Yosef Cohen',
    rabbi_es: 'Rabino Yosef Cohen',
  },
  {
    id: 'jud-2',
    title: 'תפילת שחרית',
    title_en: 'Morning Prayer Service',
    title_es: 'Servicio de Oracion Matutino',
    subtitle: 'תפילה מהכותל המערבי',
    subtitle_en: 'Prayer from the Western Wall',
    subtitle_es: 'Oracion desde el Muro Occidental',
    thumbnail: 'https://picsum.photos/seed/kotel/400/225',
    type: 'prayer',
    duration: '30:00',
  },
  {
    id: 'jud-3',
    title: 'שירי שבת',
    title_en: 'Shabbat Songs',
    title_es: 'Canciones de Shabat',
    subtitle: 'אוסף שירים לשבת',
    subtitle_en: 'Collection of Shabbat songs',
    subtitle_es: 'Coleccion de canciones de Shabat',
    thumbnail: 'https://picsum.photos/seed/shabbat/400/225',
    type: 'music',
    duration: '60:00',
  },
  {
    id: 'jud-4',
    title: 'סיפורי חסידים',
    title_en: 'Hasidic Stories',
    title_es: 'Historias Jasidicas',
    subtitle: 'סיפורים מרבותינו',
    subtitle_en: 'Stories from our Rabbis',
    subtitle_es: 'Historias de nuestros rabinos',
    thumbnail: 'https://picsum.photos/seed/hasidic/400/225',
    type: 'shiur',
    duration: '25:00',
    rabbi: 'הרב משה לוי',
    rabbi_en: 'Rabbi Moshe Levi',
    rabbi_es: 'Rabino Moshe Levi',
  },
  {
    id: 'jud-5',
    title: 'הלכות חנוכה',
    title_en: 'Laws of Hanukkah',
    title_es: 'Leyes de Januca',
    subtitle: 'הלכות והנהגות',
    subtitle_en: 'Laws and customs',
    subtitle_es: 'Leyes y costumbres',
    thumbnail: 'https://picsum.photos/seed/hanukkah/400/225',
    type: 'holiday',
    duration: '35:00',
    rabbi: 'הרב דוד ישראלי',
    rabbi_en: 'Rabbi David Israeli',
    rabbi_es: 'Rabino David Israeli',
  },
  {
    id: 'jud-6',
    title: 'ניגוני חב"ד',
    title_en: 'Chabad Melodies',
    title_es: 'Melodias de Jabad',
    subtitle: 'ניגונים מסורתיים',
    subtitle_en: 'Traditional melodies',
    subtitle_es: 'Melodias tradicionales',
    thumbnail: 'https://picsum.photos/seed/chabad/400/225',
    type: 'music',
    duration: '50:00',
  },
  {
    id: 'jud-7',
    title: 'היסטוריה יהודית',
    title_en: 'Jewish History',
    title_es: 'Historia Judia',
    subtitle: 'סרט תיעודי על יהדות אירופה',
    subtitle_en: 'Documentary on European Jewry',
    subtitle_es: 'Documental sobre la juderia europea',
    thumbnail: 'https://picsum.photos/seed/history/400/225',
    type: 'documentary',
    duration: '90:00',
  },
  {
    id: 'jud-8',
    title: 'הגדה של פסח',
    title_en: 'Passover Haggadah',
    title_es: 'Hagada de Pesaj',
    subtitle: 'קריאה מונחית',
    subtitle_en: 'Guided reading',
    subtitle_es: 'Lectura guiada',
    thumbnail: 'https://picsum.photos/seed/pesach/400/225',
    type: 'holiday',
    duration: '120:00',
  },
  {
    id: 'jud-9',
    title: 'פרקי אבות',
    title_en: 'Ethics of the Fathers',
    title_es: 'Etica de los Padres',
    subtitle: 'פירוש ועיון',
    subtitle_en: 'Commentary and study',
    subtitle_es: 'Comentario y estudio',
    thumbnail: 'https://picsum.photos/seed/avot/400/225',
    type: 'shiur',
    duration: '40:00',
    rabbi: 'הרב אברהם שפירא',
    rabbi_en: 'Rabbi Avraham Shapira',
    rabbi_es: 'Rabino Avraham Shapira',
  },
  {
    id: 'jud-10',
    title: 'סליחות',
    title_en: 'Selichot Prayers',
    title_es: 'Oraciones de Selijot',
    subtitle: 'תפילות לימים נוראים',
    subtitle_en: 'High Holiday prayers',
    subtitle_es: 'Oraciones de Dias Santos',
    thumbnail: 'https://picsum.photos/seed/selichot/400/225',
    type: 'prayer',
    duration: '45:00',
  },
];

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredContent = demoJudaismContent;
      if (selectedCategory !== 'all') {
        const categoryTypeMap: Record<string, string[]> = {
          shiurim: ['shiur', 'lecture'],
          tefila: ['prayer'],
          music: ['music'],
          holidays: ['holiday'],
          documentaries: ['documentary'],
        };
        const types = categoryTypeMap[selectedCategory] || [];
        filteredContent = demoJudaismContent.filter(item => types.includes(item.type));
      }
      setContent(filteredContent);
    } catch (err) {
      console.error('Failed to load Judaism content:', err);
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
          <Text style={styles.headerIconText}>✡️</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('judaism.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {content.length} {t('judaism.items')}
          </Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categories, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
      >
        {(isRTL ? judaismCategories : [...judaismCategories].reverse()).map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => setSelectedCategory(category.id)}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
            ]}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {getLocalizedText(category, 'name')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content Grid */}
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 5 : 3}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={styles.grid}
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
    backgroundColor: 'rgba(70, 130, 180, 0.2)',
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
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(70, 130, 180, 0.2)',
    borderColor: '#4682b4',
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryText: {
    fontSize: 16,
    color: '#888888',
  },
  categoryTextActive: {
    color: '#4682b4',
    fontWeight: 'bold',
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
    borderColor: '#4682b4',
    // @ts-ignore
    boxShadow: '0 0 20px #4682b4',
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
    backgroundColor: 'rgba(70, 130, 180, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 10,
    color: '#ffffff',
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
    color: '#4682b4',
    marginTop: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4682b4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: '#ffffff',
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
});

export default JudaismScreen;
