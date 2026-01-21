/**
 * Back Button Component
 * Navigation button to go back to previous page
 */

import { View, Text, Pressable } from 'react-native';
import { ArrowRight } from 'lucide-react';
import { colors } from '@bayit/shared/theme';

interface BackButtonProps {
  label: string;
  onPress: () => void;
}

export function BackButton({ label, onPress }: BackButtonProps) {
  return (
    <View className="px-4 py-4 max-w-[1400px] mx-auto w-full">
      <Pressable onPress={onPress} className="flex-row items-center gap-2 p-3 bg-white/10 backdrop-blur-xl rounded-lg self-start">
        <ArrowRight size={20} color={colors.text} />
        <Text className="text-sm text-white">{label}</Text>
      </Pressable>
    </View>
  );
}
