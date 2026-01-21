/**
 * KidsContentManager Component
 * Admin UI for managing kids content seeding, importing, and curation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../services/apiClient';

interface KidsStats {
  content_stats: {
    total_kids_content: number;
    by_category: Record<string, number>;
    by_age_rating: Record<string, number>;
    seed_data_available: number;
  };
  podcast_stats: {
    total_kids_podcasts: number;
    total_kids_episodes: number;
    available_feeds: number;
  };
  moderation: {
    pending_review: number;
    approved: number;
  };
}

interface ActionResult {
  message: string;
  seeded?: number;
  imported?: number;
  skipped?: number;
  errors?: string[];
}

interface PendingItem {
  id: string;
  title: string;
  title_en?: string;
  category_name?: string;
  age_rating?: number;
  content_rating?: string;
  educational_tags?: string[];
  thumbnail?: string;
}

export const KidsContentManager: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useAuthStore();

  const [stats, setStats] = useState<KidsStats | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/kids/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPendingModeration = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/kids/pending-moderation', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingItems(response.data.items);
    } catch (err: unknown) {
      console.error('Failed to fetch pending moderation:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
    fetchPendingModeration();
  }, [fetchStats, fetchPendingModeration]);

  const handleAction = async (action: string, endpoint: string, body = {}) => {
    try {
      setActionLoading(action);
      setActionResult(null);
      setError(null);

      const response = await apiClient.post(endpoint, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setActionResult(response.data);
      await fetchStats();
      await fetchPendingModeration();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (contentId: string) => {
    try {
      await apiClient.patch(`/admin/kids/curate/${contentId}`, {
        kids_moderation_status: 'approved',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchPendingModeration();
      await fetchStats();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    }
  };

  const handleReject = async (contentId: string) => {
    try {
      await apiClient.patch(`/admin/kids/curate/${contentId}`, {
        kids_moderation_status: 'rejected',
        is_kids_content: false,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchPendingModeration();
      await fetchStats();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black/20 backdrop-blur-xl rounded-2xl p-6">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-white mt-4">Loading kids content stats...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      <View className="p-6 space-y-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-white">
            {t('children.admin.stats', 'Kids Content Manager')}
          </Text>
          <Text className="text-gray-400 mt-2">
            Manage kids content sources and moderation
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-4">
            <Text className="text-red-400">{error}</Text>
          </View>
        )}

        {/* Action Result */}
        {actionResult && (
          <View className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-4">
            <Text className="text-green-400 font-semibold">{actionResult.message}</Text>
            {actionResult.seeded !== undefined && (
              <Text className="text-green-300 mt-1">Seeded: {actionResult.seeded}</Text>
            )}
            {actionResult.imported !== undefined && (
              <Text className="text-green-300 mt-1">Imported: {actionResult.imported}</Text>
            )}
            {actionResult.skipped !== undefined && (
              <Text className="text-green-300 mt-1">Skipped: {actionResult.skipped}</Text>
            )}
          </View>
        )}

        {/* Stats Cards */}
        {stats && (
          <View className="flex-row flex-wrap gap-4 mb-6">
            <View className="bg-black/20 backdrop-blur-xl rounded-xl p-4 min-w-[150px]">
              <Text className="text-gray-400 text-sm">Total Kids Content</Text>
              <Text className="text-3xl font-bold text-blue-400">
                {stats.content_stats.total_kids_content}
              </Text>
            </View>

            <View className="bg-black/20 backdrop-blur-xl rounded-xl p-4 min-w-[150px]">
              <Text className="text-gray-400 text-sm">Kids Podcasts</Text>
              <Text className="text-3xl font-bold text-purple-400">
                {stats.podcast_stats.total_kids_podcasts}
              </Text>
            </View>

            <View className="bg-black/20 backdrop-blur-xl rounded-xl p-4 min-w-[150px]">
              <Text className="text-gray-400 text-sm">Pending Review</Text>
              <Text className="text-3xl font-bold text-yellow-400">
                {stats.moderation.pending_review}
              </Text>
            </View>

            <View className="bg-black/20 backdrop-blur-xl rounded-xl p-4 min-w-[150px]">
              <Text className="text-gray-400 text-sm">Approved</Text>
              <Text className="text-3xl font-bold text-green-400">
                {stats.moderation.approved}
              </Text>
            </View>
          </View>
        )}

        {/* Category Distribution */}
        {stats && (
          <View className="bg-black/20 backdrop-blur-xl rounded-xl p-4 mb-6">
            <Text className="text-white font-semibold mb-4">Content by Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {Object.entries(stats.content_stats.by_category).map(([category, count]) => (
                <View key={category} className="bg-black/30 rounded-lg px-3 py-2">
                  <Text className="text-gray-400 text-xs">{category}</Text>
                  <Text className="text-white font-bold">{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="bg-black/20 backdrop-blur-xl rounded-xl p-4 mb-6">
          <Text className="text-white font-semibold mb-4">Content Actions</Text>
          <View className="flex-row flex-wrap gap-3">
            <TouchableOpacity
              className={`bg-blue-600 rounded-lg px-4 py-3 ${actionLoading === 'seed' ? 'opacity-50' : ''}`}
              onPress={() => handleAction('seed', '/admin/kids/seed', {})}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'seed' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">
                  {t('children.admin.seedContent', 'Seed Content')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-purple-600 rounded-lg px-4 py-3 ${actionLoading === 'archive' ? 'opacity-50' : ''}`}
              onPress={() => handleAction('archive', '/admin/kids/import/archive', {})}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'archive' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">
                  {t('children.admin.importArchive', 'Import Archive.org')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-green-600 rounded-lg px-4 py-3 ${actionLoading === 'podcasts' ? 'opacity-50' : ''}`}
              onPress={() => handleAction('podcasts', '/admin/kids/import/podcasts', {})}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'podcasts' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">
                  {t('children.admin.syncPodcasts', 'Sync Podcasts')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-red-600 rounded-lg px-4 py-3 ${actionLoading === 'youtube' ? 'opacity-50' : ''}`}
              onPress={() => handleAction('youtube', '/admin/kids/import/youtube', { max_videos_per_channel: 20 })}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'youtube' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">
                  {t('children.admin.syncYouTube', 'Sync YouTube')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-orange-600 rounded-lg px-4 py-3 ${actionLoading === 'tagvod' ? 'opacity-50' : ''}`}
              onPress={() => handleAction('tagvod', '/admin/kids/tag-vod', { dry_run: false, limit: 100 })}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'tagvod' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">
                  {t('children.admin.tagVod', 'Tag VOD')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Moderation */}
        {pendingItems.length > 0 && (
          <View className="bg-black/20 backdrop-blur-xl rounded-xl p-4">
            <Text className="text-white font-semibold mb-4">
              {t('children.admin.pendingModeration', 'Pending Moderation')} ({pendingItems.length})
            </Text>
            <View className="space-y-3">
              {pendingItems.map((item) => (
                <View
                  key={item.id}
                  className="bg-black/30 rounded-lg p-4 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-white font-medium">{item.title}</Text>
                    <View className="flex-row gap-2 mt-1">
                      <Text className="text-gray-400 text-xs">
                        {item.category_name || 'No category'}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        Age: {item.age_rating || 'N/A'}
                      </Text>
                    </View>
                    {item.educational_tags && item.educational_tags.length > 0 && (
                      <View className="flex-row gap-1 mt-2">
                        {item.educational_tags.map((tag) => (
                          <View key={tag} className="bg-blue-500/20 rounded px-2 py-0.5">
                            <Text className="text-blue-400 text-xs">{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-green-600 rounded-lg px-3 py-2"
                      onPress={() => handleApprove(item.id)}
                    >
                      <Text className="text-white text-sm">Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-red-600 rounded-lg px-3 py-2"
                      onPress={() => handleReject(item.id)}
                    >
                      <Text className="text-white text-sm">Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default KidsContentManager;
