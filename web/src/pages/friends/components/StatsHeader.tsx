import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users, UserCheck, Clock } from 'lucide-react';
import { GlassView, GlassStatCard } from '@bayit/shared/ui';

interface StatsHeaderProps {
  friendsCount: number;
  pendingCount: number;
  isRTL: boolean;
}

export function StatsHeader({ friendsCount, pendingCount, isRTL }: StatsHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <GlassView className="mb-6 p-4" intensity="low">
        <View className={`items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <View className="w-[60px] h-[60px] rounded-lg bg-[#6B21A8]/20 justify-center items-center border border-white/10">
            <Users size={32} color="#6B21A8" />
          </View>
          <View className="flex-1">
            <Text className={`text-[28px] font-bold text-white mb-1 ${isRTL ? 'text-right' : ''}`}>
              {t('friends.title', 'Friends & Opponents')}
            </Text>
            <Text className={`text-sm text-white/60 ${isRTL ? 'text-right' : ''}`}>
              {t('friends.subtitle', 'Connect with players and challenge friends')}
            </Text>
          </View>
        </View>
      </GlassView>

      <View className="flex-row gap-4 mb-6">
        <GlassStatCard
          icon={<UserCheck size={24} color="#22C55E" />}
          iconColor="#22C55E"
          label={t('friends.friendsLabel', 'Friends')}
          value={friendsCount}
          compact
          className="flex-1"
        />
        <GlassStatCard
          icon={<Clock size={24} color="#F59E0B" />}
          iconColor="#F59E0B"
          label={t('friends.pendingLabel', 'Pending')}
          value={pendingCount}
          compact
          className="flex-1"
        />
      </View>
    </>
  );
}
