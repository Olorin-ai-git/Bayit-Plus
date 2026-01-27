/**
 * Audiobook Card Component (tvOS)
 * Large TV-optimized card with focus management
 */

import React, { useState, useRef } from 'react'
import { View, Text, Image, Animated, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { Audiobook } from '../../types/audiobook'

interface AudiobookCardTVOSProps {
  audiobook: Audiobook
  onPress: () => void
  isFocused?: boolean
  onFocus?: () => void
  onBlur?: () => void
  index: number
}

export const AudiobookCardTVOS: React.FC<AudiobookCardTVOSProps> = ({
  audiobook,
  onPress,
  isFocused = false,
  onFocus,
  onBlur,
  index,
}) => {
  const { t } = useTranslation()
  const [focused, setFocused] = useState(isFocused)
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handleFocus = () => {
    setFocused(true)
    onFocus?.()
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      friction: 4,
      useNativeDriver: true,
    }).start()
  }

  const handleBlur = () => {
    setFocused(false)
    onBlur?.()
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start()
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      className="flex-1 m-3 max-w-[22%]"
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-[#1a1525] rounded-xl overflow-hidden border-4 ${
          focused ? 'border-yellow-400 shadow-2xl' : 'border-transparent'
        }`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Thumbnail */}
        {audiobook.thumbnail ? (
          <Image
            source={{ uri: audiobook.thumbnail }}
            className="w-full aspect-[3/4]"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-[3/4] bg-[#2a2235] justify-center items-center">
            <Text className="text-6xl">🎧</Text>
          </View>
        )}

        {/* Content Overlay */}
        {focused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="w-16 h-16 rounded-full bg-yellow-400 justify-center items-center">
              <Text className="text-3xl">▶</Text>
            </View>
          </View>
        )}

        {/* Title Overlay (always visible) */}
        <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
          <Text className="text-xl font-bold text-white mb-1" numberOfLines={2}>
            {audiobook.title}
          </Text>
          {audiobook.author && (
            <Text className="text-sm text-gray-300" numberOfLines={1}>
              {audiobook.author}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

export default AudiobookCardTVOS
