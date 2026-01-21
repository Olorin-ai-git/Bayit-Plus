import { View, Text, Pressable } from 'react-native';
import { Check, X } from 'lucide-react';
import { GlassCard, GlassAvatar } from '@bayit/shared/ui';
import type { FriendRequest } from '../types';

interface IncomingRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  formatTimestamp: (timestamp: string) => string;
  isRTL: boolean;
}

export function IncomingRequestCard({
  request,
  onAccept,
  onReject,
  formatTimestamp,
  isRTL,
}: IncomingRequestCardProps) {
  return (
    <GlassCard className="p-4">
      <View className={`items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <GlassAvatar
          uri={request.sender_avatar}
          name={request.sender_name}
          size="medium"
        />

        <View className="flex-1">
          <Text className={`text-base font-semibold text-white mb-1 ${isRTL ? 'text-right' : ''}`}>
            {request.sender_name}
          </Text>
          {request.message && (
            <Text className={`text-[13px] text-white/60 italic mb-1 ${isRTL ? 'text-right' : ''}`}>
              "{request.message}"
            </Text>
          )}
          <Text className={`text-xs text-white/60 ${isRTL ? 'text-right' : ''}`}>
            {formatTimestamp(request.sent_at)}
          </Text>
        </View>

        <View className={`gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <Pressable
            onPress={() => onAccept(request.id)}
            className="w-11 h-11 rounded-lg justify-center items-center border border-white/10 bg-[#6B21A8]/20 active:opacity-70 active:scale-95"
          >
            <Check size={20} color="#22C55E" />
          </Pressable>
          <Pressable
            onPress={() => onReject(request.id)}
            className="w-11 h-11 rounded-lg justify-center items-center border border-white/10 bg-[#6B21A8]/20 active:opacity-70 active:scale-95"
          >
            <X size={20} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}
