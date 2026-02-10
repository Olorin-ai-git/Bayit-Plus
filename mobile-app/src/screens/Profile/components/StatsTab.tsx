import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../../stores/profileStore';

export function StatsTab() {
  const { t } = useTranslation();
  const { stats } = useProfileStore();

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('profile.noStats', 'No statistics available')}</Text>
      </View>
    );
  }

  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const achievements = [
    {
      id: 'first-watch',
      title: t('profile.achievement.firstWatch', 'First Watch'),
      description: t('profile.achievement.firstWatchDesc', 'Watched your first content'),
      unlocked: stats.watch_time_minutes > 0,
      icon: '🎬',
    },
    {
      id: 'binge-watcher',
      title: t('profile.achievement.bingeWatcher', 'Binge Watcher'),
      description: t('profile.achievement.bingeWatcherDesc', 'Watched 10+ hours of content'),
      unlocked: stats.watch_time_minutes >= 600,
      icon: '📺',
    },
    {
      id: 'curator',
      title: t('profile.achievement.curator', 'Curator'),
      description: t('profile.achievement.curatorDesc', 'Added 10+ items to watchlist'),
      unlocked: stats.playlist_count >= 10,
      icon: '📋',
    },
    {
      id: 'super-fan',
      title: t('profile.achievement.superFan', 'Super Fan'),
      description: t('profile.achievement.superFanDesc', 'Favorited 20+ items'),
      unlocked: stats.favorites_count >= 20,
      icon: '⭐',
    },
    {
      id: 'dedicated',
      title: t('profile.achievement.dedicated', 'Dedicated Viewer'),
      description: t('profile.achievement.dedicatedDesc', 'Watched 50+ hours of content'),
      unlocked: stats.watch_time_minutes >= 3000,
      icon: '🏆',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.watchStats', 'Watch Statistics')}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatWatchTime(stats.watch_time_minutes)}</Text>
            <Text style={styles.statLabel}>{t('profile.totalWatchTime', 'Total Watch Time')}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.playlist_count}</Text>
            <Text style={styles.statLabel}>{t('profile.watchlistItems', 'Watchlist Items')}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.favorites_count}</Text>
            <Text style={styles.statLabel}>{t('profile.favoritesCount', 'Favorites')}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.downloads_count}</Text>
            <Text style={styles.statLabel}>{t('profile.downloads', 'Downloads')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.achievements', 'Achievements')}</Text>

        <View style={styles.achievementsList}>
          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[styles.achievementCard, !achievement.unlocked && styles.achievementLocked]}
            >
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <View style={styles.achievementContent}>
                <Text
                  style={[styles.achievementTitle, !achievement.unlocked && styles.achievementTitleLocked]}
                >
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
              {achievement.unlocked && <Text style={styles.checkmark}>✓</Text>}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '50%',
    padding: 6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#A855F7',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    borderRadius: 12,
    padding: 16,
  },
  achievementLocked: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: 'rgba(255,255,255,0.5)',
  },
  achievementDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  checkmark: {
    fontSize: 24,
    color: '#10B981',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
