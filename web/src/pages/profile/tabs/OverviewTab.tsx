import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Star } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';
import type { RecentActivity } from '../types';

interface OverviewTabProps {
  isRTL: boolean;
  recentActivity: RecentActivity[];
}

interface InfoRowProps {
  label: string;
  value: string;
  isRTL: boolean;
}

function InfoRow({ label, value, isRTL }: InfoRowProps) {
  return (
    <View className="flex-row justify-between py-2">
      {isRTL ? (
        <>
          <Text className="text-sm text-white font-medium text-left">{value}</Text>
          <Text className="text-sm text-white/60 text-right">{label}</Text>
        </>
      ) : (
        <>
          <Text className="text-sm text-white/60 text-left">{label}</Text>
          <Text className="text-sm text-white font-medium text-right">{value}</Text>
        </>
      )}
    </View>
  );
}

export function OverviewTab({ isRTL, recentActivity }: OverviewTabProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('profile.justNow', 'Just now');
    if (diffHours < 24) return t('profile.hoursAgo', '{{hours}} hours ago', { hours: diffHours });
    if (diffDays === 1) return t('profile.yesterday', 'Yesterday');
    return date.toLocaleDateString();
  };

  return (
    <View className="gap-6">
      <GlassView className="p-6 gap-4">
        <Text className={`text-[13px] font-semibold text-white/60 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('profile.recentActivity', 'Recent Activity')}
        </Text>
        <View className="gap-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <View key={activity.id} className="flex-row items-center gap-4">
                {isRTL ? (
                  <>
                    <View className="flex-1">
                      <Text className="text-sm text-white text-right" numberOfLines={1}>
                        {activity.title}
                      </Text>
                      <Text className="text-xs text-white/60 text-right">
                        {formatTimestamp(activity.timestamp)}
                      </Text>
                    </View>
                    {activity.type === 'watched' ? (
                      <PlayCircle size={20} color="#6B21A8" />
                    ) : (
                      <Star size={20} color="#F59E0B" />
                    )}
                  </>
                ) : (
                  <>
                    {activity.type === 'watched' ? (
                      <PlayCircle size={20} color="#6B21A8" />
                    ) : (
                      <Star size={20} color="#F59E0B" />
                    )}
                    <View className="flex-1">
                      <Text className="text-sm text-white text-left" numberOfLines={1}>
                        {activity.title}
                      </Text>
                      <Text className="text-xs text-white/60 text-left">
                        {formatTimestamp(activity.timestamp)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ))
          ) : (
            <Text className={`text-sm text-white/60 italic ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('profile.noRecentActivity', 'No recent activity')}
            </Text>
          )}
        </View>
      </GlassView>

      <GlassView className="p-6 gap-4">
        <Text className={`text-[13px] font-semibold text-white/60 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('profile.accountInfo', 'Account Information')}
        </Text>
        <View className="gap-2">
          <InfoRow label={t('profile.name', 'Name')} value={user?.name || '-'} isRTL={isRTL} />
          <InfoRow label={t('profile.email', 'Email')} value={user?.email || '-'} isRTL={isRTL} />
          <InfoRow label={t('profile.role', 'Role')} value={user?.role || 'user'} isRTL={isRTL} />
        </View>
      </GlassView>
    </View>
  );
}
