import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  Image,
} from 'react-native';

const logo = require('../assets/logo.png');
import { useNavigation } from '@react-navigation/native';
import { ContentRow } from '../components/ContentRow';
import { contentService, liveService, historyService } from '../services/api';

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type?: string;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
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
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>טוען תוכן...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Banner */}
      <View style={styles.hero}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.heroTitle}>ברוכים הבאים לבית+</Text>
        <Text style={styles.heroSubtitle}>הבית שלך בארה״ב לתוכן ישראלי</Text>
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
    backgroundColor: '#0d0d1a',
  },
  content: {
    paddingVertical: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
  },
  hero: {
    paddingHorizontal: 48,
    paddingVertical: 60,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'right',
  },
  heroSubtitle: {
    fontSize: 24,
    color: '#888888',
    textAlign: 'right',
  },
});

export default HomeScreen;
