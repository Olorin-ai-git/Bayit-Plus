/**
 * SubtitleMenuBackdrop Component
 * Full-screen transparent backdrop to catch clicks outside the menu
 */

import { View } from 'react-native'
import { platformClass, platformStyle } from '@/utils/platformClass'

interface SubtitleMenuBackdropProps {
  onClose: () => void
}

export default function SubtitleMenuBackdrop({ onClose }: SubtitleMenuBackdropProps) {
  return (
    <View
      className={platformClass('absolute inset-0 z-[199] cursor-default')}
      style={platformStyle({
        web: { pointerEvents: 'auto' },
        native: {},
      })}
      onClick={(e: any) => {
        e.stopPropagation()
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e: any) => e.stopPropagation()}
      onMouseUp={(e: any) => e.stopPropagation()}
    />
  )
}
