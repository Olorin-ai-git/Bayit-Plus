import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Star, CheckCircle, Clock, XCircle } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useMissionsStore } from '@/stores/missionsStore';
import logger from '@bayit/shared-utils/logger';

const missionLogger = logger.scope('MissionCard');

interface MissionCardProps {
  mission: {
    id: string;
    type: string;
    title: string;
    title_he: string;
    icon_name: string;
    target_value: number;
    current_value: number;
    reward_amount: number;
    status: 'active' | 'completed' | 'claimed' | 'expired';
  };
  profileId?: string;
}

const ICON_MAP: Record<string, any> = {
  star: Star,
  check: CheckCircle,
  clock: Clock,
  x: XCircle,
};

export function MissionCard({ mission, profileId }: MissionCardProps) {
  const { claimMission } = useMissionsStore();
  const progress = Math.min((mission.current_value / mission.target_value) * 100, 100);

  const handleClaim = async () => {
    try {
      await claimMission(mission.id, profileId);
    } catch (error) {
      missionLogger.error('Failed to claim mission from card', error);
    }
  };

  const getStatusColor = () => {
    switch (mission.status) {
      case 'completed':
        return colors.success[500];
      case 'claimed':
        return colors.info[500];
      case 'expired':
        return colors.error[500];
      default:
        return colors.primary[400];
    }
  };

  const IconComponent = ICON_MAP[mission.icon_name] || Star;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <IconComponent size={24} color={colors.primary[400]} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{mission.title}</Text>
          <Text style={styles.titleHe}>{mission.title_he}</Text>
        </View>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardAmount}>{mission.reward_amount}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {mission.current_value} / {mission.target_value}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {mission.status.toUpperCase()}
          </Text>
        </View>

        {mission.status === 'completed' && (
          <Pressable
            style={({ pressed }) => [
              styles.claimButton,
              pressed && styles.claimButtonPressed,
            ]}
            onPress={handleClaim}
          >
            <Text style={styles.claimButtonText}>Claim</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass.bgMedium,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: spacing[1],
  },
  title: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: '600',
  },
  titleHe: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  rewardBadge: {
    backgroundColor: colors.primary[400] + '20',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  rewardAmount: {
    fontSize: fontSize.sm,
    color: colors.primary[400],
    fontWeight: '700',
  },
  progressContainer: {
    gap: spacing[2],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.glass.bgStrong,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[400],
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  claimButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  claimButtonPressed: {
    backgroundColor: colors.primary[700],
  },
  claimButtonText: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: '600',
  },
});
