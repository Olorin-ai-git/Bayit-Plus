/**
 * FeedNavigation Component
 * Progress bar, navigation dots, swipe hints, and counter
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassView } from '@bayit/shared/ui';

interface FeedNavigationProps {
  currentIndex: number;
  totalItems: number;
  progress: number;
  showProgress: boolean;
  hasDuration: boolean;
  onGoToIndex: (index: number) => void;
}

export function FeedNavigation({
  currentIndex,
  totalItems,
  progress,
  showProgress,
  hasDuration,
  onGoToIndex,
}: FeedNavigationProps) {
  const visibleDots = Array.from(
    { length: Math.min(5, totalItems) },
    (_, i) => Math.max(0, currentIndex - 2) + i
  ).filter((idx) => idx < totalItems);

  return (
    <>
      {/* Progress Bar */}
      {showProgress && hasDuration && (
        <View className="absolute top-0 left-0 right-0 h-[3px] bg-white/20">
          <View
            className="h-full bg-purple-700"
            style={{ width: `${progress}%` }}
          />
        </View>
      )}

      {/* Navigation Dots */}
      <View className="absolute right-2 top-1/2 -translate-y-1/2 gap-2">
        {visibleDots.map((index) => (
          <Pressable
            key={index}
            className="w-2 rounded"
            style={[index === currentIndex ? styles.dotActive : styles.dotInactive]}
            onPress={() => onGoToIndex(index)}
          />
        ))}
      </View>

      {/* Swipe Hints */}
      <View className="absolute left-0 right-0 items-center pointer-events-none">
        {currentIndex > 0 && (
          <View className="absolute top-12 p-2 bg-white/10 rounded-full">
            <Text className="text-base text-gray-500">↑</Text>
          </View>
        )}
        {currentIndex < totalItems - 1 && (
          <View className="absolute bottom-12 p-2 bg-white/10 rounded-full">
            <Text className="text-base text-gray-500">↓</Text>
          </View>
        )}
      </View>

      {/* Counter */}
      <GlassView className="absolute top-4 left-4 px-2 py-1" intensity="low">
        <Text className="text-xs text-white font-mono">
          {currentIndex + 1} / {totalItems}
        </Text>
      </GlassView>
    </>
  );
}

const styles = StyleSheet.create({
  dotActive: {
    height: 20,
    backgroundColor: '#7e22ce',
  },
  dotInactive: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
