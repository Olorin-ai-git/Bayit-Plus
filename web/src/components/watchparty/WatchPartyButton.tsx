import { useState, useRef, useEffect } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Users, Plus, UserPlus, ChevronDown } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

interface WatchPartyButtonProps {
  hasActiveParty: boolean
  onCreateClick: () => void
  onJoinClick: () => void
  onPanelToggle: () => void
}

export default function WatchPartyButton({
  hasActiveParty,
  onCreateClick,
  onJoinClick,
  onPanelToggle,
}: WatchPartyButtonProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<View>(null)
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Close dropdown on outside click
      setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  if (hasActiveParty) {
    return (
      <Pressable
        onPress={onPanelToggle}
        className="flex-row items-center gap-3 px-3 py-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20"
      >
        <Users size={18} color="#34D399" />
        <Text className="text-sm font-medium text-emerald-400">{t('watchParty.active')}</Text>
        <View className="relative w-2 h-2">
          <View className="absolute w-2 h-2 rounded-full bg-emerald-600" />
          <View className="absolute w-2 h-2 rounded-full bg-emerald-400 opacity-75" />
        </View>
      </Pressable>
    )
  }

  return (
    <View className="relative" ref={dropdownRef}>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10"
      >
        <Users size={18} color={colors.text} />
        <Text className="text-sm font-medium text-white">{t('watchParty.title')}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={14} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {isOpen && (
        <GlassView className="absolute left-0 bottom-full mb-3 w-48 py-2 z-50" intensity="high">
          <Pressable
            onPress={() => {
              setIsOpen(false)
              onCreateClick()
            }}
            className="flex-row items-center gap-3 px-4 py-3 text-right hover:bg-white/10"
          >
            <Plus size={18} color={colors.primary} />
            <Text className="text-sm text-white">{t('watchParty.create')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setIsOpen(false)
              onJoinClick()
            }}
            className="flex-row items-center gap-3 px-4 py-3 text-right hover:bg-white/10"
          >
            <UserPlus size={18} color="#3B82F6" />
            <Text className="text-sm text-white">{t('watchParty.join')}</Text>
          </Pressable>
        </GlassView>
      )}
    </View>
  )
}
