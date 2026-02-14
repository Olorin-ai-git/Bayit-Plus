/**
 * RewardsScreenMobile - Mobile rewards hub screen
 *
 * Features:
 * - Wallet balance display, level progress
 * - Coupon shop, leaderboard, recent transactions
 * - Pull-to-refresh, RTL support, accessibility
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useRewardStore } from '@bayit/shared/stores/rewardStore';
import api from '@bayit/shared-services/api';
import { Colors } from '../theme/colors';
import { ShekelsWallet } from '../components/rewards/ShekelsWallet';
import { LevelProgress } from '../components/rewards/LevelProgress';
import { TransactionRowCard } from '../components/rewards/TransactionRowCard';
import { LeaderboardMobile } from '../components/rewards/LeaderboardMobile';
import { styles } from './RewardsScreenMobile.styles';
import logger from '@/utils/logger';

const rewardsLogger = logger.scope('RewardsScreenMobile');

interface Transaction {
  id: string;
  type: 'earned' | 'spent' | 'bonus';
  description: string;
  amount: number;
  date: string;
}

interface LevelInfo {
  level: number;
  levelName: string;
  currentXP: number;
  nextLevelXP: number;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  score: number;
  avatar_url?: string;
}

export const RewardsScreenMobile: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { profileId } = (route.params || {}) as { profileId?: string };

  const { stats, isLoading: storeLoading, fetchRewards, fetchStats } = useRewardStore();
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      await fetchRewards(profileId);
      await fetchStats(profileId);
      const [txRes, lvRes, lbRes] = await Promise.allSettled([
        api.get('/rewards/transactions', { params: { profile_id: profileId } }),
        api.get('/gamification/profile', { params: { profile_id: profileId } }),
        api.get('/rewards/leaderboard'),
      ]);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.transactions || []);
      if (lvRes.status === 'fulfilled') {
        const lv = lvRes.value;
        setLevelInfo({ level: lv.current_level, levelName: lv.level_title,
          currentXP: lv.current_xp, nextLevelXP: lv.xp_to_next_level });
      }
      if (lbRes.status === 'fulfilled') setLeaderboard(lbRes.value.entries || []);
      rewardsLogger.info('Rewards data loaded', { profileId });
    } catch (err: any) {
      setLoadError(err?.message || t('rewards.errors.loadFailed'));
      rewardsLogger.error('Failed to load rewards data', { profileId, error: err });
    }
  }, [profileId, fetchRewards, fetchStats, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (storeLoading && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <GlassLoadingSpinner size="large" />
          <Text style={styles.loadingText}>{t('rewards.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          tintColor={Colors.Primary.default} colors={[Colors.Primary.default]} />}
        showsVerticalScrollIndicator={false}>

        <Text style={[styles.screenTitle, { textAlign }]} accessibilityRole="header"
          accessibilityLabel={t('rewards.title')}>
          {t('rewards.title')}
        </Text>

        <ShekelsWallet balance={stats?.total_points ?? 0} points={stats?.total_points ?? 0} />

        {levelInfo && (
          <LevelProgress currentXP={levelInfo.currentXP} nextLevelXP={levelInfo.nextLevelXP}
            level={levelInfo.level} levelName={levelInfo.levelName} />
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.quizzes_completed ?? 0}</Text>
            <Text style={[styles.statLabel, { textAlign }]}>{t('rewards.quizzesCompleted')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.current_streak ?? 0}</Text>
            <Text style={[styles.statLabel, { textAlign }]}>{t('rewards.currentStreak')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.perfect_scores ?? 0}</Text>
            <Text style={[styles.statLabel, { textAlign }]}>{t('rewards.perfectScores')}</Text>
          </View>
        </View>

        {transactions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('rewards.recentActivity')}</Text>
            {transactions.slice(0, 10).map((tx) => (
              <TransactionRowCard key={tx.id} transaction={tx} />
            ))}
          </>
        )}

        {leaderboard.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('rewards.leaderboard')}</Text>
            <LeaderboardMobile entries={leaderboard} currentUserId={profileId || ''} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RewardsScreenMobile;
