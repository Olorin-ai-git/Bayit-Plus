/**
 * NewsItemCard component - Displays a news article card.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared/hooks';
import { styles } from '../JudaismScreen.styles';
import { NewsItem } from '../types';

interface NewsItemCardProps {
  item: NewsItem;
  index: number;
  onPress: () => void;
}

export const NewsItemCard: React.FC<NewsItemCardProps> = ({ item, index, onPress }) => {
  const [isFocused, setIsFocused] = useState(false);
  const { i18n } = useTranslation();
  const { textAlign, flexDirection } = useDirection();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const stripHtml = (html: string | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[styles.newsItem, isFocused && styles.newsItemFocused]}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <View style={[styles.newsItemContent, { flexDirection }]}>
        <View style={styles.newsSourceBadge}>
          <Text style={styles.newsSourceText}>{item.source_name}</Text>
        </View>
        <Text style={styles.newsDate}>{formatDate(item.published_at)}</Text>
      </View>
      <Text style={[styles.newsTitle, { textAlign }]} numberOfLines={2}>
        {stripHtml(i18n.language === 'he' && item.title_he ? item.title_he : item.title)}
      </Text>
      {item.summary && (
        <Text style={[styles.newsSummary, { textAlign }]} numberOfLines={2}>
          {stripHtml(item.summary)}
        </Text>
      )}
    </TouchableOpacity>
  );
};
