import { View, Text, Pressable } from 'react-native'
import { Link } from 'react-router-dom'
import { Play, Info, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { HeroActionsProps } from './types'

/**
 * HeroActions - Action buttons for hero section
 *
 * Features:
 * - Primary play button (solid purple with glow effect)
 * - Secondary info button (glass with backdrop blur)
 * - Icon-only add to list button
 * - Hover states with scale transforms
 * - Accessible labels
 *
 * @param contentId - Content ID for routing
 * @param onPlay - Callback when play button pressed
 */
export default function HeroActions({ contentId, onPlay }: HeroActionsProps) {
  const { t } = useTranslation()

  return (
    <View className="flex-row items-center gap-4">
      {/* Primary Play Button */}
      <Pressable
        onPress={onPlay}
        className="flex-row items-center gap-2 bg-purple-500 px-6 py-3 rounded-lg hover:shadow-[0_0_16px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-95 transition-transform"
      >
        <Play size={20} fill="#000000" color="#000000" />
        <Text className="text-base font-semibold text-black">
          {t('hero.watch')}
        </Text>
      </Pressable>

      {/* Secondary Info Button */}
      <Link to={`/vod/movie/${contentId}`} style={{ textDecoration: 'none' }}>
        <Pressable
          className="flex-row items-center gap-2 bg-black/60 px-6 py-3 rounded-lg border border-purple-500/20 hover:bg-black/85 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-95 transition-transform"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any}
        >
          <Info size={20} color="#ffffff" />
          <Text className="text-base font-semibold text-white">
            {t('hero.moreInfo')}
          </Text>
        </Pressable>
      </Link>

      {/* Icon Button - Add to List */}
      <Pressable
        className="w-12 h-12 rounded-lg bg-white/10 border border-purple-500/20 items-center justify-center hover:bg-white/15 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] active:scale-95 transition-transform"
        accessibilityLabel={t('hero.addToList')}
      >
        <Plus size={20} color="#ffffff" />
      </Pressable>
    </View>
  )
}
