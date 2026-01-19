import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { FocusableCard } from './FocusableCard';
import { useDirection } from '../hooks/useDirection';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Platform-specific styling
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
const isMobilePhone = isMobile && !Platform.isTV;

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
}

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  onItemPress: (item: ContentItem) => void;
}

export const ContentRow: React.FC<ContentRowProps> = ({
  title,
  items,
  onItemPress,
}) => {
  const { isRTL, textAlign } = useDirection();

  // Mobile-friendly margins
  const sideMargin = isMobilePhone ? 12 : 48;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign, marginRight: isRTL ? sideMargin : 0, marginLeft: isRTL ? 0 : sideMargin }]}>{title}</Text>
      <View style={[styles.scrollContainer, { paddingRight: isRTL ? sideMargin : 0, paddingLeft: isRTL ? 0 : sideMargin }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { flexDirection: isRTL ? 'row-reverse' : 'row', paddingLeft: isRTL ? sideMargin : 0, paddingRight: isRTL ? 0 : sideMargin }]}
        >
          {items.map((item) => (
            <FocusableCard
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              imageUrl={item.thumbnail}
              onPress={() => onItemPress(item)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: IS_TV_BUILD ? 60 : (isMobilePhone ? 16 : 40),
  },
  title: {
    fontSize: IS_TV_BUILD ? 36 : (isMobilePhone ? 18 : 28),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: IS_TV_BUILD ? 24 : (isMobilePhone ? 8 : 16),
  },
  scrollContainer: {
  },
  scrollContent: {
    paddingHorizontal: isMobilePhone ? 8 : 0,
  },
});

export default ContentRow;
