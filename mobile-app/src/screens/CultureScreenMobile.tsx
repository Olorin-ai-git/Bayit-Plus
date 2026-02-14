/**
 * CultureScreenMobile
 *
 * Culture hub with categories: Jerusalem, Tel Aviv, Music, Food, History.
 * Hero section with featured cultural content and horizontal category rows.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { cultureService, jerusalemService, telAvivService } from '@bayit/shared-services/api';
import { JerusalemRowMobile } from '../components/culture/JerusalemRowMobile';
import { TelAvivRowMobile } from '../components/culture/TelAvivRowMobile';
import { CultureCard } from '../components/culture/CultureCard';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('CultureScreenMobile');

interface CultureItem {
  id: string;
  title: string;
  image?: string;
  category: string;
  description?: string;
}

interface FeaturedContent {
  id: string;
  title: string;
  image?: string;
  description?: string;
  category: string;
}

export const CultureScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL } = useDirection();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featured, setFeatured] = useState<FeaturedContent | null>(null);
  const [jerusalemItems, setJerusalemItems] = useState<CultureItem[]>([]);
  const [telAvivItems, setTelAvivItems] = useState<CultureItem[]>([]);
  const [musicItems, setMusicItems] = useState<CultureItem[]>([]);
  const [foodItems, setFoodItems] = useState<CultureItem[]>([]);
  const [historyItems, setHistoryItems] = useState<CultureItem[]>([]);

  const loadContent = useCallback(async () => {
    try {
      setIsLoading(true);

      const results = await Promise.allSettled([
        cultureService.getFeatured('israeli'),
        jerusalemService.getContent(undefined, 1, 10),
        telAvivService.getContent(undefined, 1, 10),
        telAvivService.getMusicContent(1, 10),
        telAvivService.getCultureContent(1, 10),
        jerusalemService.getContent('history', 1, 10),
      ]);

      const extractItems = (result: PromiseSettledResult<any>): CultureItem[] => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          return (data?.items || data?.content || []).map((item: any) => ({
            id: item.id || item.source_id,
            title: item.title || item.title_native || '',
            image: item.image_url || item.thumbnail,
            category: item.category || '',
            description: item.summary || item.description,
          }));
        }
        return [];
      };

      if (results[0].status === 'fulfilled') {
        const featuredData = results[0].value;
        const featuredItem = featuredData?.items?.[0] || featuredData?.content?.[0];
        if (featuredItem) {
          setFeatured({
            id: featuredItem.id || featuredItem.source_id,
            title: featuredItem.title || featuredItem.title_native,
            image: featuredItem.image_url || featuredItem.thumbnail,
            description: featuredItem.summary || featuredItem.description,
            category: featuredItem.category || 'culture',
          });
        }
      }

      setJerusalemItems(extractItems(results[1]));
      setTelAvivItems(extractItems(results[2]));
      setMusicItems(extractItems(results[3]));
      setFoodItems(extractItems(results[4]));
      setHistoryItems(extractItems(results[5]));

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ['featured', 'jerusalem', 'telAviv', 'music', 'food', 'history'];
          moduleLogger.warn(`Failed to load ${names[index]}`, { error: result.reason });
        }
      });
    } catch (err) {
      moduleLogger.error('Failed to load culture content', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent, i18n.language]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  }, [loadContent]);

  const handleItemPress = useCallback((item: CultureItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: 'vod',
    });
  }, [navigation]);

  if (isLoading && !featured) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <NativeIcon name="globe" size="lg" color={colors.primary} />
          <Text style={styles.headerTitle}>{t('culture.title')}</Text>
        </View>

        {featured && (
          <CultureCard
            item={featured}
            onPress={() => handleItemPress(featured)}
            variant="hero"
          />
        )}

        {jerusalemItems.length > 0 && (
          <JerusalemRowMobile
            items={jerusalemItems}
            onItemPress={handleItemPress}
          />
        )}

        {telAvivItems.length > 0 && (
          <TelAvivRowMobile
            items={telAvivItems}
            onItemPress={handleItemPress}
          />
        )}

        {musicItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('culture.music')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalRow}
            >
              {musicItems.map((item) => (
                <CultureCard
                  key={item.id}
                  item={item}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {foodItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('culture.food')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalRow}
            >
              {foodItems.map((item) => (
                <CultureCard
                  key={item.id}
                  item={item}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {historyItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('culture.history')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalRow}
            >
              {historyItems.map((item) => (
                <CultureCard
                  key={item.id}
                  item={item}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.text, fontSize: fontSize.md, marginTop: spacing.md },
  header: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  sectionContainer: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  horizontalRow: { gap: spacing.md, paddingRight: spacing.md },
  bottomSpacer: { height: spacing.xxl },
});

export default CultureScreenMobile;
