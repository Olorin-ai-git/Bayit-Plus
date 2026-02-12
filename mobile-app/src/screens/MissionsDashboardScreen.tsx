import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import { OlorinIcon } from '@olorin/icons/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import api from '@bayit/shared-services/api';
import logger from '@/utils/logger';
import { styles } from './MissionsDashboardScreen.styles';

const dashboardLogger = logger.scope('MissionsDashboardScreen');

interface GamificationProfile {
  current_level: number;
  current_xp: number;
  total_xp: number;
  xp_to_next_level: number;
  level_title: string;
  level_title_he: string;
  unlocked_perks: UnlockedPerk[];
  missions_completed: number;
  mirror_sessions: number;
  talk_back_attempts: number;
}

interface UnlockedPerk {
  perk_id: string;
  perk_type: string;
  level_unlocked: number;
  unlocked_at: string;
}

export const MissionsDashboardScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { textAlign } = useDirection();
  const { profileId } = route.params;

  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/gamification/profile', {
        params: { profile_id: profileId },
      });
      setProfile(data);
      dashboardLogger.info('Loaded gamification profile', { profileId, level: data.current_level });
    } catch (err: any) {
      setError(err?.message || t('gamification.errors.fetchProfileFailed'));
      dashboardLogger.error('Failed to load profile', { profileId, error: err });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <GlassLoadingSpinner size="large" />
          <Text style={styles.loadingText}>{t('gamification.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <GlassButton variant="primary" onPress={loadProfile} title={t('common.retry')} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return null;
  }

  const levelTitle = i18n.language === 'he' ? profile.level_title_he : profile.level_title;
  const xpProgress = profile.xp_to_next_level > 0
    ? (profile.current_xp / profile.xp_to_next_level) * 100
    : 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.levelCard}>
          <Text style={[styles.levelNumber, { textAlign }]}>{profile.current_level}</Text>
          <Text style={[styles.levelTitle, { textAlign }]}>{levelTitle}</Text>

          <View style={styles.xpBarContainer}>
            <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
          </View>
          <Text style={[styles.xpText, { textAlign }]}>
            {profile.xp_to_next_level > 0
              ? t('gamification.xpProgress', {
                  current: profile.current_xp.toLocaleString(),
                  next: profile.xp_to_next_level.toLocaleString(),
                })
              : t('gamification.maxLevel')}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { textAlign }]}>{t('gamification.unlockedPerks')}</Text>
        {profile.unlocked_perks.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign }]}>{t('gamification.noPerksYet')}</Text>
        ) : (
          <View style={styles.perkGrid}>
            {profile.unlocked_perks.map((perk) => (
              <View key={perk.perk_id} style={styles.perkItem}>
                <View style={styles.perkIcon}>
                  <OlorinIcon name={perk.perk_type === 'outfit' ? 'shirt' : 'gift'} size={32} />
                </View>
                <Text style={[styles.perkName, { textAlign: 'center' }]}>
                  {t(`gamification.perks.${perk.perk_id}`, { defaultValue: perk.perk_id })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { textAlign }]}>{t('gamification.activity')}</Text>
        <View style={styles.activitySection}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { textAlign }]}>{t('gamification.missionsCompleted')}</Text>
            <Text style={styles.statValue}>{profile.missions_completed}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { textAlign }]}>{t('gamification.mirrorSessions')}</Text>
            <Text style={styles.statValue}>{profile.mirror_sessions}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { textAlign }]}>{t('gamification.talkBackAttempts')}</Text>
            <Text style={styles.statValue}>{profile.talk_back_attempts}</Text>
          </View>
          <View style={[styles.statRow, styles.statRowLast]}>
            <Text style={[styles.statLabel, { textAlign }]}>{t('gamification.totalXP')}</Text>
            <Text style={styles.statValue}>{profile.total_xp}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MissionsDashboardScreen;
