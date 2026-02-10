import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@bayit/shared-stores';
import { useActivityFeedStore, type FeedItem } from '../stores/activityFeedStore';

export function ActivityFeedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const {
    continueWatching,
    recentlyAdded,
    trending,
    friends,
    loading,
    fetchAllFeeds,
  } = useActivityFeedStore();

  useEffect(() => {
    if (user) {
      fetchAllFeeds();
    }
  }, [user, fetchAllFeeds]);

  const handleContentPress = (item: FeedItem) => {
    navigation.navigate('Player' as never, {
      id: item.id,
      title: item.title,
      type: item.type,
    } as never);
  };

  const renderContentItem = (item: FeedItem, showProgress = false) => (
    <TouchableOpacity
      key={item.id}
      style={styles.contentCard}
      onPress={() => handleContentPress(item)}
      activeOpacity={0.8}
    >
      {item.thumbnail && (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      )}
      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {showProgress && item.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(item.progress)}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (
    title: string,
    items: FeedItem[],
    showProgress = false
  ) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {items.map((item) => renderContentItem(item, showProgress))}
        </ScrollView>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {t('auth.loginRequired', 'Please log in to view activity feed')}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('activity.feed', 'Activity Feed')}</Text>
        {friends.length > 0 && (
          <Text style={styles.friendsCount}>
            {friends.length} {t('activity.friends', 'friends')}
          </Text>
        )}
      </View>

      {renderSection(
        t('activity.continueWatching', 'Continue Watching'),
        continueWatching,
        true
      )}

      {renderSection(
        t('activity.recentlyAdded', 'Recently Added'),
        recentlyAdded
      )}

      {renderSection(
        t('activity.trending', 'Trending Now'),
        trending
      )}

      {friends.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('activity.yourFriends', 'Your Friends')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {friends.map((friend) => (
              <View key={friend.user_id} style={styles.friendCard}>
                {friend.avatar ? (
                  <Image source={{ uri: friend.avatar }} style={styles.friendAvatar} />
                ) : (
                  <View style={styles.friendAvatarPlaceholder}>
                    <Text style={styles.friendInitial}>
                      {(friend.displayName || friend.email || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.friendName} numberOfLines={1}>
                  {friend.displayName || friend.email || t('common.user', 'User')}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
    paddingHorizontal: 20,
  },
  header: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  friendsCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  section: {
    marginTop: 24,
    paddingLeft: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  contentCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 140,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  contentInfo: {
    padding: 10,
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  friendCard: {
    width: 80,
    marginRight: 12,
    alignItems: 'center',
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  friendAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  friendInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  friendName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
});
