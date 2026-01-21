/**
 * Loading State Component
 * Skeleton loading state for watch page
 */

import { View } from 'react-native';

export function LoadingState() {
  return (
    <View className="flex-1">
      <View className="aspect-video bg-white/10 backdrop-blur-xl rounded-2xl mx-4 mb-6" />
      <View className="h-8 w-64 bg-white/10 backdrop-blur-xl rounded-lg mx-4 mb-4" />
      <View className="h-4 w-4/5 max-w-[600px] bg-white/10 backdrop-blur-xl rounded-lg mx-4" />
    </View>
  );
}
