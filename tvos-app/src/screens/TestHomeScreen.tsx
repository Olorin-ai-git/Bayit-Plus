import React from 'react';
import { View, Text } from 'react-native';

export const TestHomeScreen: React.FC = () => {
  return (
    <View className="flex-1 justify-center items-center bg-black">
      <Text className="text-purple-500 text-5xl font-bold">Bayit+ tvOS</Text>
      <Text className="text-white text-2xl mt-4">Test Screen</Text>
    </View>
  );
};

export default TestHomeScreen;
