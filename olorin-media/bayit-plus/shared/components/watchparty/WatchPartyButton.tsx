import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { isTV } from '../../utils/platform';

interface WatchPartyButtonProps {
  hasActiveParty: boolean;
  onCreatePress: () => void;
  onJoinPress: () => void;
  onPanelToggle: () => void;
  hasTVPreferredFocus?: boolean;
}

export const WatchPartyButton: React.FC<WatchPartyButtonProps> = ({
  hasActiveParty,
  onCreatePress,
  onJoinPress,
  onPanelToggle,
  hasTVPreferredFocus = false,
}) => {
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    if (isTV) {
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isTV) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (hasActiveParty) {
      onPanelToggle();
    } else {
      setMenuVisible(!menuVisible);
    }
  };

  if (hasActiveParty) {
    return (
      <TouchableOpacity
        onPress={onPanelToggle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View
          className={isFocused ? "shadow-lg shadow-green-500/50" : ""}
          style={{ transform: [{ scale: scaleAnim }] }}
        >
          <GlassView
            className="flex-row items-center py-3 px-4 gap-3 bg-green-500/10"
            intensity="medium"
            borderColor="#10b981"
          >
            <Text className="text-base">👥</Text>
            <Text className="text-sm font-medium text-green-500">{t('watchParty.active')}</Text>
            <View className="w-2 h-2 rounded-full bg-green-500" />
          </GlassView>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="relative">
      <TouchableOpacity
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View
          className={isFocused ? "shadow-lg shadow-purple-500/50" : ""}
          style={{ transform: [{ scale: scaleAnim }] }}
        >
          <GlassView
            className="flex-row items-center py-3 px-4 gap-3"
            intensity="medium"
            borderColor={isFocused ? '#9333ea' : undefined}
          >
            <Text className="text-base">👥</Text>
            <Text className="text-sm font-medium text-white">{t('watchParty.title')}</Text>
          </GlassView>
        </Animated.View>
      </TouchableOpacity>

      {menuVisible && (
        <GlassView className="absolute bottom-full left-0 mb-3 min-w-[160px] p-1 z-[100]" intensity="high">
          <TouchableOpacity
            className="flex-row items-center py-3 px-4 gap-3 rounded"
            onPress={() => {
              setMenuVisible(false);
              onCreatePress();
            }}
          >
            <Text className="text-base">➕</Text>
            <Text className="text-sm text-white">{t('watchParty.create')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center py-3 px-4 gap-3 rounded"
            onPress={() => {
              setMenuVisible(false);
              onJoinPress();
            }}
          >
            <Text className="text-base">🔗</Text>
            <Text className="text-sm text-white">{t('watchParty.join')}</Text>
          </TouchableOpacity>
        </GlassView>
      )}
    </View>
  );
};

export default WatchPartyButton;
