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
import { liveService } from '../services/api';

interface Channel {
  id: string;
  name: string;
  logo?: string;
  currentProgram?: string;
  category?: string;
}

const ChannelCard: React.FC<{
  channel: Channel;
  onPress: () => void;
  index: number;
}> = ({ channel, onPress, index }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={[
          styles.channelCard,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.channelCardFocused,
        ]}
      >
        {/* Channel Logo */}
        <View style={styles.logoContainer}>
          {channel.logo ? (
            <Image
              source={{ uri: channel.logo }}
              style={styles.channelLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>{channel.name[0]}</Text>
            </View>
          )}
        </View>

        {/* Channel Info */}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={1}>
            {channel.name}
          </Text>
          {channel.currentProgram && (
            <Text style={styles.currentProgram} numberOfLines={1}>
              {channel.currentProgram}
            </Text>
          )}
        </View>

        {/* Live Indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const LiveTVScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'הכל' },
    { id: 'news', label: 'חדשות' },
    { id: 'entertainment', label: 'בידור' },
    { id: 'sports', label: 'ספורט' },
    { id: 'kids', label: 'ילדים' },
  ];

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setIsLoading(true);
      const response = await liveService.getChannels();

      if (response.channels?.length) {
        setChannels(response.channels);
      } else {
        // Demo data
        setChannels([
          { id: 'kan11', name: 'כאן 11', currentProgram: 'מבט', category: 'news', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Kan_11_Logo.svg/200px-Kan_11_Logo.svg.png' },
          { id: 'keshet12', name: 'קשת 12', currentProgram: 'חדשות 12', category: 'news', logo: 'https://upload.wikimedia.org/wikipedia/he/thumb/3/3f/Keshet_12_logo.svg/200px-Keshet_12_logo.svg.png' },
          { id: 'reshet13', name: 'רשת 13', currentProgram: 'חדשות 13', category: 'news', logo: 'https://upload.wikimedia.org/wikipedia/he/thumb/5/54/Reshet_13_Logo.svg/200px-Reshet_13_Logo.svg.png' },
          { id: 'channel14', name: 'ערוץ 14', currentProgram: 'פאנל', category: 'news' },
          { id: 'sport5', name: 'ספורט 5', currentProgram: 'כדורגל חי', category: 'sports' },
          { id: 'yes_sport', name: 'ספורט 1', currentProgram: 'NBA', category: 'sports' },
          { id: 'hop', name: 'הופ!', currentProgram: 'דורה', category: 'kids' },
          { id: 'logi', name: 'לוגי', currentProgram: 'ספוג בוב', category: 'kids' },
          { id: 'hot3', name: 'HOT 3', currentProgram: 'סרט ערב', category: 'entertainment' },
          { id: 'yes_drama', name: 'yes דרמה', currentProgram: 'פאודה', category: 'entertainment' },
          { id: 'comedy', name: 'קומדי סנטרל', currentProgram: 'סיינפלד', category: 'entertainment' },
          { id: 'i24', name: 'i24NEWS', currentProgram: 'World News', category: 'news' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      // Set demo data on error
      setChannels([
        { id: 'kan11', name: 'כאן 11', currentProgram: 'מבט', category: 'news' },
        { id: 'keshet12', name: 'קשת 12', currentProgram: 'חדשות 12', category: 'news' },
        { id: 'reshet13', name: 'רשת 13', currentProgram: 'חדשות 13', category: 'news' },
        { id: 'channel14', name: 'ערוץ 14', currentProgram: 'פאנל', category: 'news' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChannels = selectedCategory === 'all'
    ? channels
    : channels.filter(c => c.category === selectedCategory);

  const handleChannelPress = (channel: Channel) => {
    navigation.navigate('Player', {
      id: channel.id,
      title: channel.name,
      type: 'live',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>טוען ערוצים...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>📺</Text>
        </View>
        <View>
          <Text style={styles.title}>שידור חי</Text>
          <Text style={styles.subtitle}>{filteredChannels.length} ערוצים</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categories}>
        {categories.map((cat, index) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            style={[
              styles.categoryButton,
              selectedCategory === cat.id && styles.categoryButtonActive,
            ]}
            hasTVPreferredFocus={index === 0}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Channel Grid */}
      <FlatList
        data={filteredChannels}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <ChannelCard
            channel={item}
            onPress={() => handleChannelPress(item)}
            index={index}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    direction: 'rtl',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: '#888888',
    marginTop: 4,
    textAlign: 'right',
  },
  categories: {
    flexDirection: 'row',
    paddingHorizontal: 48,
    marginBottom: 24,
    gap: 12,
    zIndex: 10,
  },
  categoryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    borderColor: '#00d9ff',
  },
  categoryText: {
    fontSize: 16,
    color: '#888888',
  },
  categoryTextActive: {
    color: '#00d9ff',
    fontWeight: 'bold',
  },
  grid: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 16,
    direction: 'ltr',
  },
  cardTouchable: {
    flex: 1,
    margin: 8,
    maxWidth: '25%',
  },
  channelCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    minHeight: 180,
  },
  channelCardFocused: {
    borderColor: '#00d9ff',
    backgroundColor: '#252542',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  channelLogo: {
    width: 80,
    height: 60,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  currentProgram: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: 'bold',
  },
});

export default LiveTVScreen;
