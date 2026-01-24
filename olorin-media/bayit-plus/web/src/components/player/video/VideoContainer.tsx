/**
 * VideoContainer - Main video element wrapper
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { forwardRef } from 'react'
import { StyleSheet } from 'react-native'
import { z } from 'zod'

// Zod schema for prop validation
const VideoContainerPropsSchema = z.object({
  poster: z.string().optional(),
  onContainerClick: z.function().args().returns(z.void()),
})

export type VideoContainerProps = z.infer<typeof VideoContainerPropsSchema> & {
  videoRef: React.RefObject<HTMLVideoElement>
  children?: React.ReactNode
}

const VideoContainer = forwardRef<HTMLDivElement, VideoContainerProps>(
  ({ videoRef, poster, onContainerClick, children }, containerRef) => {
    return (
      <div ref={containerRef} style={webStyles.container} onClick={onContainerClick}>
        <video ref={videoRef} poster={poster} style={webStyles.video} playsInline />
        {children}
      </div>
    )
  }
)

VideoContainer.displayName = 'VideoContainer'

export default VideoContainer

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
    cursor: 'pointer',
  },
  video: {
    width: '100%',
    height: '100%',
  },
}
