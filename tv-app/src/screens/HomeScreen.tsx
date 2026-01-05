import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { ContentRow } from '../components/ContentRow';
import { GlassCarousel } from '../components/GlassCarousel';
import { contentService, liveService, historyService } from '../services/api';
import { colors } from '../theme';

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type?: string;
}

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [featured, setFeatured] = useState<ContentItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; items: ContentItem[] }[]>([]);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);

      // Load all content in parallel
      const [featuredRes, liveRes] = await Promise.all([
        contentService.getFeatured().catch(() => ({ items: [] })),
        liveService.getChannels().catch(() => ({ channels: [] })),
      ]);

      // Carousel featured items
      setCarouselItems([
        {
          id: 'hero1',
          title: 'פאודה',
          subtitle: 'עונה 4 - עכשיו בשידור',
          description: 'הסדרה הישראלית המצליחה חוזרת לעונה רביעית מלאת מתח ואקשן',
          image: 'https://picsum.photos/1200/600?random=100',
          badge: 'חדש',
        },
        {
          id: 'hero2',
          title: 'שטיסל',
          subtitle: 'כל העונות זמינות',
          description: 'עקבו אחר משפחת שטיסל בשכונה החרדית בירושלים',
          image: 'https://picsum.photos/1200/600?random=101',
          badge: 'מומלץ',
        },
        {
          id: 'hero3',
          title: 'טהרן',
          subtitle: 'עונה 2',
          description: 'סוכנת מוסד בלב איראן במשימה מסוכנת',
          image: 'https://picsum.photos/1200/600?random=102',
        },
        {
          id: 'hero4',
          title: 'שידור חי - כאן 11',
          subtitle: 'צפו עכשיו',
          description: 'חדשות, תוכניות אקטואליה ותוכן איכותי',
          image: 'https://picsum.photos/1200/600?random=103',
          badge: 'LIVE',
        },
      ]);

      // Mock data for demo
      setFeatured(featuredRes.items?.length ? featuredRes.items : [
        { id: '1', title: 'פאודה', subtitle: 'עונה 4', thumbnail: 'https://picsum.photos/400/225?random=1' },
        { id: '2', title: 'שטיסל', subtitle: 'עונה 3', thumbnail: 'https://picsum.photos/400/225?random=2' },
        { id: '3', title: 'טהרן', subtitle: 'עונה 2', thumbnail: 'https://picsum.photos/400/225?random=3' },
        { id: '4', title: 'אופנה', subtitle: 'קומדיה', thumbnail: 'https://picsum.photos/400/225?random=4' },
      ]);

      setLiveChannels(liveRes.channels?.length ? liveRes.channels : [
        { id: 'kan11', title: 'כאן 11', subtitle: 'שידור חי', thumbnail: 'https://picsum.photos/400/225?random=5' },
        { id: 'keshet12', title: 'קשת 12', subtitle: 'שידור חי', thumbnail: 'https://picsum.photos/400/225?random=6' },
        { id: 'reshet13', title: 'רשת 13', subtitle: 'שידור חי', thumbnail: 'https://picsum.photos/400/225?random=7' },
        { id: 'channel14', title: 'ערוץ 14', subtitle: 'שידור חי', thumbnail: 'https://picsum.photos/400/225?random=8' },
      ]);

      setContinueWatching([
        { id: '5', title: 'הבורר', subtitle: '45:30 נותרו', thumbnail: 'https://picsum.photos/400/225?random=9' },
        { id: '6', title: 'עבודה ערבית', subtitle: '22:15 נותרו', thumbnail: 'https://picsum.photos/400/225?random=10' },
      ]);

      setCategories([
        {
          name: 'סרטים ישראליים',
          items: [
            { id: '10', title: 'וואלס עם באשיר', thumbnail: 'https://picsum.photos/400/225?random=11' },
            { id: '11', title: 'לבנון', thumbnail: 'https://picsum.photos/400/225?random=12' },
            { id: '12', title: 'פוקסטרוט', thumbnail: 'https://picsum.photos/400/225?random=13' },
          ],
        },
        {
          name: 'דוקומנטרים',
          items: [
            { id: '20', title: 'עובדה', thumbnail: 'https://picsum.photos/400/225?random=14' },
            { id: '21', title: 'מקור', thumbnail: 'https://picsum.photos/400/225?random=15' },
          ],
        },
      ]);

    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: ContentItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: item.type || 'vod',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <AnimatedLogo size="large" />
        <Text style={styles.loadingText}>טוען תוכן...</Text>
      </View>
    );
  }

  const handleCarouselPress = (item: CarouselItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: item.badge === 'LIVE' ? 'live' : 'vod',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Logo at Top */}
      <View style={styles.logoSection}>
        <AnimatedLogo size="medium" />
      </View>

      {/* Hero Carousel */}
      <View style={styles.carouselSection}>
        <GlassCarousel
          items={carouselItems}
          onItemPress={handleCarouselPress}
          height={450}
          autoPlayInterval={6000}
        />
      </View>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <ContentRow
          title="המשך צפייה"
          items={continueWatching}
          onItemPress={handleItemPress}
        />
      )}

      {/* Live TV */}
      <ContentRow
        title="שידור חי"
        items={liveChannels}
        onItemPress={(item) => handleItemPress({ ...item, type: 'live' })}
      />

      {/* Featured */}
      <ContentRow
        title="מומלצים"
        items={featured}
        onItemPress={handleItemPress}
      />

      {/* Categories */}
      {categories.map((category) => (
        <ContentRow
          key={category.name}
          title={category.name}
          items={category.items}
          onItemPress={handleItemPress}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
    direction: 'rtl',
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
    marginTop: 32,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  carouselSection: {
    paddingHorizontal: 48,
    marginBottom: 32,
  },
});

export default HomeScreen;
