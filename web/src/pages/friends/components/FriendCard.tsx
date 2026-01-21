import { Pressable, View, Text } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassAvatar } from '@bayit/shared/ui';
import type { UserCardProps } from '../types';

interface FriendCardProps extends UserCardProps {
  isRTL: boolean;
}

export function FriendCard({
  userId,
  name,
  avatar,
  friendCount,
  gamesPlayed,
  relationship,
  onAction,
  actionLabel,
  actionIcon: ActionIcon,
  actionColor = '#6B21A8',
  secondaryAction,
  secondaryLabel,
  secondaryIcon: SecondaryIcon,
  subtitle,
  isRTL,
}: FriendCardProps) {
  const navigate = useNavigate();

  const viewProfile = () => {
    navigate(`/player/${userId}`);
  };

  return (
    <GlassCard className="p-4">
      <Pressable
        onPress={viewProfile}
        className={`items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <GlassAvatar uri={avatar} name={name} size="medium" />

        <View className="flex-1">
          <Text className={`text-base font-semibold text-white mb-0.5 ${isRTL ? 'text-right' : ''}`}>{name}</Text>
          {subtitle && (
            <Text className={`text-[13px] text-white/60 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {subtitle}
            </Text>
          )}
          {(friendCount !== undefined || gamesPlayed !== undefined) && (
            <View className={`gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              {friendCount !== undefined && (
                <Text className="text-xs text-white/60">{friendCount} friends</Text>
              )}
              {gamesPlayed !== undefined && (
                <Text className="text-xs text-white/60">{gamesPlayed} games</Text>
              )}
            </View>
          )}
        </View>

        <View className={`items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {secondaryAction && SecondaryIcon && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                secondaryAction();
              }}
              className="w-9 h-9 rounded-lg bg-white/5 justify-center items-center"
            >
              <SecondaryIcon size={20} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
          {onAction && ActionIcon && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="flex-row items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: `${actionColor}20` }}
            >
              <ActionIcon size={18} color={actionColor} />
              {actionLabel && (
                <Text className="text-[13px] font-semibold" style={{ color: actionColor }}>
                  {actionLabel}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    </GlassCard>
  );
}
