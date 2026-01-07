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
import { liveService } from '../services/api';
import { colors, spacing } from '../theme';
import { useDirection } from '../hooks/useDirection';
import { GlassCategoryPill } from '../components';
import { getLocalizedName, getLocalizedCurrentProgram } from '@bayit/shared-utils/contentLocalization';

interface Channel {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  logo?: string;
  currentProgram?: string;
  current_program?: string;
  current_program_en?: string;
  current_program_es?: string;
  category?: string;
}

const ChannelCard: React.FC<{
  channel: Channel;
  onPress: () => void;
  index: number;
  liveLabel: string;
  localizedName: string;
  localizedProgram: string;
}> = ({ channel, onPress, index, liveLabel, localizedName, localizedProgram }) => {
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
            {localizedName}
          </Text>
          {localizedProgram && (
            <Text style={styles.currentProgram} numberOfLines={1}>
              {localizedProgram}
            </Text>
          )}
        </View>

        {/* Live Indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{liveLabel}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const LiveTVScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: 'all', labelKey: 'liveTV.categories.all' },
    { id: 'news', labelKey: 'liveTV.categories.news' },
    { id: 'entertainment', labelKey: 'liveTV.categories.entertainment' },
    { id: 'sports', labelKey: 'liveTV.categories.sports' },
    { id: 'kids', labelKey: 'liveTV.categories.kids' },
  ];

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await liveService.getChannels() as any;
      setChannels(response.channels || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('liveTv.loadError', 'Failed to load channels');
      setError(errorMessage);
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChannels = selectedCategory === 'all'
    ? channels
    : channels.filter(c => c.category === selectedCategory);

  const handleChannelPress = (channel: Channel) => {
    const localizedTitle = getLocalizedName(channel, i18n.language);
    navigation.navigate('Player', {
      id: channel.id,
      title: localizedTitle,
      type: 'live',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? 20 : 0, marginRight: isRTL ? 0 : 20 }]}>
          <Text style={styles.headerIconText}>📺</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('liveTV.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{filteredChannels.length} {t('liveTV.channels')}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={[styles.categories, { flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: isRTL ? 'flex-start' : 'flex-start' }]}>
        {categories.map((cat, index) => (
          <GlassCategoryPill
            key={cat.id}
            label={t(cat.labelKey)}
            isActive={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            hasTVPreferredFocus={index === 0}
          />
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
            liveLabel={t('common.live')}
            localizedName={getLocalizedName(item, i18n.language)}
            localizedProgram={getLocalizedCurrentProgram(item, i18n.language)}
          />
        )}
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
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
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
    backgroundColor: colors.glass,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 180,
  },
  channelCardFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundLighter,
    // @ts-ignore - Web CSS property for glow effect
    boxShadow: `0 0 20px ${colors.primary}`,
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
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  currentProgram: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.live,
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    color: colors.live,
    fontWeight: 'bold',
  },
});

export default LiveTVScreen;
