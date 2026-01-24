/**
 * SubtitleMenuBackdrop Component
 * Full-screen transparent backdrop to catch clicks outside the menu
 */

import { View, StyleSheet } from 'react-native'

interface SubtitleMenuBackdropProps {
  onClose: () => void
}

export default function SubtitleMenuBackdrop({ onClose }: SubtitleMenuBackdropProps) {
  return (
    <View
      style={styles.backdrop}
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

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 199,
    cursor: 'default',
    pointerEvents: 'auto',
  },
})
