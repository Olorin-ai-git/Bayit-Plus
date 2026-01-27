/**
 * Audiobook Row Component (tvOS)
 * Horizontal scrollable row with focus navigation
 */

import React, { useState, useRef } from 'react'
import { View, Text, FlatList, TVEventHandler } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useDirection } from '@bayit/shared/hooks'
import { AudiobookCardTVOS } from './AudiobookCardTVOS'
import type { Audiobook } from '../../types/audiobook'

interface AudiobookRowTVOSProps {
  title: string
  audiobooks: Audiobook[]
  onSelectAudiobook: (audiobook: Audiobook) => void
}

export const AudiobookRowTVOS: React.FC<AudiobookRowTVOSProps> = ({
  title,
  audiobooks,
  onSelectAudiobook,
}) => {
  const { t } = useTranslation()
  const { isRTL, textAlign } = useDirection()
  const [focusedIndex, setFocusedIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const tvEventHandler = useRef<TVEventHandler | null>(null)

  const handleTVEvent = (evt: any) => {
    if (evt.eventType === 'right' && !isRTL) {
      if (focusedIndex < audiobooks.length - 1) {
        const nextIndex = focusedIndex + 1
        setFocusedIndex(nextIndex)
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
          viewPosition: 0.5,
        })
      }
    } else if (evt.eventType === 'left' && !isRTL) {
      if (focusedIndex > 0) {
        const prevIndex = focusedIndex - 1
        setFocusedIndex(prevIndex)
        flatListRef.current?.scrollToIndex({
          index: prevIndex,
          animated: true,
          viewPosition: 0.5,
        })
      }
    } else if (evt.eventType === 'left' && isRTL) {
      if (focusedIndex < audiobooks.length - 1) {
        const nextIndex = focusedIndex + 1
        setFocusedIndex(nextIndex)
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
          viewPosition: 0.5,
        })
      }
    } else if (evt.eventType === 'right' && isRTL) {
      if (focusedIndex > 0) {
        const prevIndex = focusedIndex - 1
        setFocusedIndex(prevIndex)
        flatListRef.current?.scrollToIndex({
          index: prevIndex,
          animated: true,
          viewPosition: 0.5,
        })
      }
    } else if (evt.eventType === 'select') {
      onSelectAudiobook(audiobooks[focusedIndex])
    }
  }

  React.useEffect(() => {
    const tvEvent = new TVEventHandler()
    tvEvent.enable(null, handleTVEvent)
    tvEventHandler.current = tvEvent

    return () => {
      tvEvent.disable()
    }
  }, [focusedIndex, audiobooks, isRTL])

  return (
    <View className="mb-12">
      {/* Row Title */}
      <Text
        className="text-3xl font-bold text-white px-12 mb-4"
        style={{ textAlign }}
      >
        {title}
      </Text>

      {/* Horizontal Scrollable List */}
      <FlatList
        ref={flatListRef}
        data={audiobooks}
        keyExtractor={(item) => item.id}
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 32,
          direction: isRTL ? 'rtl' : 'ltr',
        }}
        renderItem={({ item, index }) => (
          <AudiobookCardTVOS
            audiobook={item}
            isFocused={index === focusedIndex}
            onPress={() => onSelectAudiobook(item)}
            index={index}
          />
        )}
      />
    </View>
  )
}

export default AudiobookRowTVOS
