import { useState } from 'react';
import { favoritesService, downloadsService, historyService } from '@/services/api';
import type { UserStats, RecentActivity } from '../types';

export function useProfileData() {
  const [stats, setStats] = useState<UserStats>({ favorites: 0, downloads: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadUserStats = async () => {
    setStatsLoading(true);
    try {
      const [favoritesData, downloadsData] = await Promise.all([
        favoritesService.getFavorites().catch(() => ({ items: [] })),
        downloadsService.getDownloads().catch(() => []),
      ]);

      const favoritesCount = favoritesData?.items?.length ?? 0;
      const downloadsCount = Array.isArray(downloadsData) ? downloadsData.length : 0;

      setStats({
        favorites: favoritesCount,
        downloads: downloadsCount,
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const historyData = await historyService.getContinueWatching().catch(() => []);

      if (Array.isArray(historyData) && historyData.length > 0) {
        const activities: RecentActivity[] = historyData.slice(0, 5).map((item: any) => ({
          id: item.content_id || item.id,
          type: 'watched' as const,
          title: item.title || item.content_title || 'Unknown',
          timestamp: item.updated_at || item.watched_at || new Date().toISOString(),
        }));
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  };

  return {
    stats,
    statsLoading,
    recentActivity,
    loadUserStats,
    loadRecentActivity,
  };
}
