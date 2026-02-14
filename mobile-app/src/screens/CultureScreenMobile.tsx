/**
 * CultureScreenMobile
 *
 * Culture hub with categories: Jerusalem, Tel Aviv, Music, Food, History.
 * Hero section with featured cultural content and horizontal category rows.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
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
  id: string; title: string; image?: string; category: string; description?: string;
}

export const CultureScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL } = useDirection();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featured, setFeatured] = useState<CultureItem | null>(null);
  const [jerusalemItems, setJerusalemItems] = useState<CultureItem[]>([]);
  const [telAvivItems, setTelAvivItems] = useState<CultureItem[]>([]);
  const [musicItems, setMusicItems] = useState<CultureItem[]>([]);
  const [foodItems, setFoodItems] = useState<CultureItem[]>([]);
  const [historyItems, setHistoryItems] = useState<CultureItem[]>([]);

  const extractItems = (result: PromiseSettledResult<any>): CultureItem[] => {
    if (result.status !== 'fulfilled') return [];
    const data = result.value;
    return (data?.items || data?.content || []).map((item: any) => ({
      id: item.id || item.source_id, title: item.title || item.title_native || '',
      image: item.image_url || item.thumbnail, category: item.category || '',
      description: item.summary || item.description,
    }));
  };

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        cultureService.getFeatured('israeli'), jerusalemService.getContent(undefined, 1, 10),
        telAvivService.getContent(undefined, 1, 10), telAvivService.getMusicContent(1, 10),
        telAvivService.getCultureContent(1, 10), jerusalemService.getContent('history', 1, 10),
      ]);

      if (results[0].status === 'fulfilled') {
        const fData = results[0].value;
        const fItem = fData?.items?.[0] || fData?.content?.[0];
        if (fItem) setFeatured({ id: fItem.id || fItem.source_id, title: fItem.title || fItem.title_native, image: fItem.image_url || fItem.thumbnail, description: fItem.summary || fItem.description, category: fItem.category || 'culture' });
      }
      setJerusalemItems(extractItems(results[1]));
      setTelAvivItems(extractItems(results[2]));
      setMusicItems(extractItems(results[3]));
      setFoodItems(extractItems(results[4]));
      setHistoryItems(extractItems(results[5]));

      results.forEach((r, i) => { if (r.status === 'rejected') { const n = ['featured','jerusalem','telAviv','music','food','history']; moduleLogger.warn(`Failed to load ${n[i]}`, { error: r.reason }); } });
    } catch (err) { moduleLogger.error('Culture load failed', { error: err instanceof Error ? err.message : String(err) }); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent, i18n.language]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadContent(); setRefreshing(false); }, [loadContent]);
  const handleItemPress = useCallback((item: CultureItem) => { navigation.navigate('Player', { id: item.id, title: item.title, type: 'vod' }); }, [navigation]);

  if (isLoading && !featured) {
    return (<SafeAreaView style={styles.loadWrap}><GlassLoadingSpinner size="large" /><Text style={styles.loadText}>{t('common.loading')}</Text></SafeAreaView>);
  }

  const renderSection = (title: string, items: CultureItem[]) => items.length > 0 ? (
    <View style={styles.sectionWrap}>
      <Text style={[styles.secTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
        {items.map((item) => (<CultureCard key={item.id} item={item} onPress={() => handleItemPress(item)} />))}
      </ScrollView>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <NativeIcon name="globe" size="lg" color={colors.primary} />
          <Text style={styles.headerTitle}>{t('culture.title')}</Text>
        </View>
        {featured && <CultureCard item={featured} onPress={() => handleItemPress(featured)} variant="hero" />}
        {jerusalemItems.length > 0 && <JerusalemRowMobile items={jerusalemItems} onItemPress={handleItemPress} />}
        {telAvivItems.length > 0 && <TelAvivRowMobile items={telAvivItems} onItemPress={handleItemPress} />}
        {renderSection(t('culture.music'), musicItems)}
        {renderSection(t('culture.food'), foodItems)}
        {renderSection(t('culture.history'), historyItems)}
        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadWrap: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadText: { color: colors.text, fontSize: fontSize.md, marginTop: spacing.md },
  header: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  sectionWrap: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  secTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  hRow: { gap: spacing.md, paddingRight: spacing.md },
  spacer: { height: spacing.xxl },
});

export default CultureScreenMobile;
