/**
 * Cast Section Component
 * Displays series cast information
 */

import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

interface CastSectionProps {
  cast?: string[];
  textAlign: 'left' | 'right' | 'center';
}

export function CastSection({ cast, textAlign }: CastSectionProps) {
  const { t } = useTranslation();

  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <View className="px-12 py-6">
      <Text className="text-lg font-semibold text-white mb-4">{t('content.cast')}</Text>
      <Text className="text-base text-white/70 leading-6" style={{ textAlign }}>{cast.join(', ')}</Text>
    </View>
  );
}
