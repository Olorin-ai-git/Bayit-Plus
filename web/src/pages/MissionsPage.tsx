import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Target, Trophy, Gift } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useMissionsStore } from '@/stores/missionsStore';
import { MissionCard } from '@/components/missions/MissionCard';
import { LeaderboardPanel } from '@/components/missions/LeaderboardPanel';
import { ShekelBalance } from '@/components/missions/ShekelBalance';

type Tab = 'missions' | 'leaderboard' | 'rewards';

export default function MissionsPage() {
  const { dailyMissions, loadingMissions, fetchDailyMissions, fetchBalance } = useMissionsStore();
  const [activeTab, setActiveTab] = useState<Tab>('missions');

  useEffect(() => {
    fetchDailyMissions();
    fetchBalance();
  }, []);

  const renderTabButton = (tab: Tab, label: string, icon: any) => {
    const isActive = activeTab === tab;
    const IconComponent = icon;

    return (
      <Pressable
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setActiveTab(tab)}
      >
        <IconComponent
          size={20}
          color={isActive ? colors.primary[400] : colors.textSecondary}
        />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
        {isActive && <View style={styles.tabIndicator} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Missions</Text>
        <Text style={styles.subtitle}>Complete missions to earn shekels</Text>
      </View>

      <ShekelBalance />

      <View style={styles.tabBar}>
        {renderTabButton('missions', 'Missions', Target)}
        {renderTabButton('leaderboard', 'Leaderboard', Trophy)}
        {renderTabButton('rewards', 'Rewards', Gift)}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'missions' && (
          <View style={styles.missionsContainer}>
            {loadingMissions ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading missions...</Text>
              </View>
            ) : dailyMissions.length > 0 ? (
              dailyMissions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No missions available</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'leaderboard' && <LeaderboardPanel />}

        {activeTab === 'rewards' && (
          <View style={styles.rewardsContainer}>
            <View style={styles.placeholderCard}>
              <Gift size={48} color={colors.primary[400]} />
              <Text style={styles.placeholderTitle}>Rewards Coming Soon</Text>
              <Text style={styles.placeholderText}>
                Use your shekels to unlock exclusive content and features
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[950],
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: fontSize['3xl'],
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  subtitle: { fontSize: fontSize.base, color: colors.textSecondary },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.glass.bgMedium,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: colors.glass.purpleLight,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary[400],
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing[2],
    right: spacing[2],
    height: 2,
    backgroundColor: colors.primary[400],
    borderRadius: borderRadius.full,
  },
  content: {
    flex: 1,
  },
  missionsContainer: {
    gap: spacing[3],
  },
  loadingContainer: {
    padding: spacing[8],
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  emptyContainer: {
    padding: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  rewardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderCard: {
    alignItems: 'center',
    padding: spacing[8],
    backgroundColor: colors.glass.bgMedium,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glass.border,
    maxWidth: 400,
  },
  placeholderTitle: {
    fontSize: fontSize.xl,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  placeholderText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
