import { View, Text } from 'react-native';
import { GlassView } from '@bayit/shared/ui';

interface StatCardProps {
  icon: any;
  iconColor?: string;
  label: string;
  value: string | number;
  loading?: boolean;
}

export function StatCard({
  icon: Icon,
  iconColor = '#6B21A8',
  label,
  value,
  loading,
}: StatCardProps) {
  return (
    <GlassView className="flex-1 min-w-[120px] p-4 items-center gap-2">
      <View className="w-10 h-10 rounded-lg justify-center items-center mb-2" style={{ backgroundColor: `${iconColor}15` }}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text className="text-xl font-bold text-white">{loading ? '...' : value}</Text>
      <Text className="text-xs text-white/60 text-center">{label}</Text>
    </GlassView>
  );
}
