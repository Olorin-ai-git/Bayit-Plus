/**
 * Not Found State Component
 * Displays when content is not found
 */

import { View, Text } from 'react-native';
import { Link } from 'react-router-dom';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';

interface NotFoundStateProps {
  notFoundLabel: string;
  backToHomeLabel: string;
}

export function NotFoundState({
  notFoundLabel,
  backToHomeLabel,
}: NotFoundStateProps) {
  return (
    <View className="flex-1 justify-center items-center py-16 px-4">
      <GlassCard className="p-9 items-center">
        <Text className="text-2xl font-bold text-white mb-4">{notFoundLabel}</Text>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Text className="text-base" style={{ color: colors.primary }}>{backToHomeLabel}</Text>
        </Link>
      </GlassCard>
    </View>
  );
}
