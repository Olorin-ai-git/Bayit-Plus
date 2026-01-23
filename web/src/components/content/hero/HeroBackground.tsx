import { View, Image } from 'react-native'
import type { HeroBackgroundProps } from './types'

/**
 * HeroBackground - Displays backdrop image with gradient overlays
 *
 * Features:
 * - Full-bleed background image
 * - Vertical gradient (bottom to top)
 * - Horizontal gradient (left to right)
 * - Glassmorphic effect preparation
 *
 * @param imageUri - Background image URL
 * @param height - Container height in pixels
 */
export default function HeroBackground({ imageUri, height }: HeroBackgroundProps) {
  if (!imageUri) return null

  return (
    <View className="absolute inset-0" style={{ height }}>
      {/* Background Image */}
      <Image
        source={{ uri: imageUri }}
        className="w-full h-full"
        resizeMode="cover"
      />

      {/* Vertical Gradient Overlay - Dark to transparent top */}
      <View
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(to top, #111122, rgba(17, 17, 34, 0.6), transparent)',
        } as any}
      />

      {/* Horizontal Gradient Overlay - Dark left to transparent right */}
      <View
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(17, 17, 34, 0.7), rgba(17, 17, 34, 0.2), transparent)',
        } as any}
      />
    </View>
  )
}
