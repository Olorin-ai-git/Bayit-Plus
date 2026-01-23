/**
 * VideoCenterControls - Center play/pause and skip buttons
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { View, Text } from 'react-native'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'
import { platformClass, platformStyle } from '@/utils/platformClass'

// Zod schema for prop validation
const VideoCenterControlsPropsSchema = z.object({
  isPlaying: z.boolean(),
  isLive: z.boolean(),
  onTogglePlay: z.function().args().returns(z.void()),
  onSkip: z.function().args(z.number()).returns(z.void()),
})

export type VideoCenterControlsProps = z.infer<typeof VideoCenterControlsPropsSchema>

export default function VideoCenterControls({
  isPlaying,
  isLive,
  onTogglePlay,
  onSkip,
}: VideoCenterControlsProps) {
  const handleClick = (e: any, action: () => void) => {
    e?.stopPropagation?.()
    action()
  }

  return (
    <View
      className={platformClass(
        'absolute inset-0 flex-row items-center justify-center gap-8 pointer-events-none',
        'absolute inset-0 flex-row items-center justify-center gap-8'
      )}
    >
      {/* Skip Backward 30s */}
      {!isLive && (
        <View
          onClick={(e: any) => handleClick(e, () => onSkip(-30))}
          className={platformClass(
            'w-14 h-14 rounded-full bg-black/30 backdrop-blur-md items-center justify-center border border-white/10 cursor-pointer opacity-90 pointer-events-auto hover:opacity-100 hover:scale-105 transition-all',
            'w-14 h-14 rounded-full bg-black/30 items-center justify-center border border-white/10 opacity-90'
          )}
          style={platformStyle({
            web: { cursor: 'pointer' },
          })}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.text}
            strokeWidth={2}
          >
            <path d="M12 5V1L7 6l5 5V7a6 6 0 11-6 6" />
          </svg>
          <Text className="text-[11px] font-bold text-white -mt-1">30</Text>
        </View>
      )}

      {/* Play/Pause Button */}
      <View
        onClick={(e: any) => handleClick(e, onTogglePlay)}
        className={platformClass(
          'w-20 h-20 rounded-full bg-black/30 backdrop-blur-md items-center justify-center border border-white/10 cursor-pointer pointer-events-auto hover:scale-110 transition-all',
          'w-20 h-20 rounded-full bg-black/30 items-center justify-center border border-white/10'
        )}
        style={platformStyle({
          web: { cursor: 'pointer' },
        })}
      >
        {isPlaying ? (
          <svg width={40} height={40} viewBox="0 0 24 24" fill={colors.text}>
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg
            width={40}
            height={40}
            viewBox="0 0 24 24"
            fill={colors.text}
            style={{ marginLeft: 4 }}
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </View>

      {/* Skip Forward 30s */}
      {!isLive && (
        <View
          onClick={(e: any) => handleClick(e, () => onSkip(30))}
          className={platformClass(
            'w-14 h-14 rounded-full bg-black/30 backdrop-blur-md items-center justify-center border border-white/10 cursor-pointer opacity-90 pointer-events-auto hover:opacity-100 hover:scale-105 transition-all',
            'w-14 h-14 rounded-full bg-black/30 items-center justify-center border border-white/10 opacity-90'
          )}
          style={platformStyle({
            web: { cursor: 'pointer' },
          })}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.text}
            strokeWidth={2}
          >
            <path d="M12 5V1l5 5-5 5V7a6 6 0 106 6" />
          </svg>
          <Text className="text-[11px] font-bold text-white -mt-1">30</Text>
        </View>
      )}
    </View>
  )
}
