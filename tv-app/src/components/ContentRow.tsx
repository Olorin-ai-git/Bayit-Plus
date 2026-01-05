import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { FocusableCard } from './FocusableCard';

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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.scrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
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
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    marginRight: 48,
    textAlign: 'right',
  },
  scrollContainer: {
    paddingRight: 48,
  },
  scrollContent: {
    paddingLeft: 48,
    flexDirection: 'row-reverse',
  },
});

export default ContentRow;
