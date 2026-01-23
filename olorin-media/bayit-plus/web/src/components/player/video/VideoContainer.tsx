/**
 * VideoContainer - Main video element wrapper
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { forwardRef } from 'react'
import { z } from 'zod'
import { platformClass, platformStyle } from '@/utils/platformClass'

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
      <div
        ref={containerRef}
        className={platformClass(
          'relative bg-black w-full h-full cursor-pointer',
          'relative bg-black w-full h-full'
        )}
        style={platformStyle({
          web: { cursor: 'pointer' },
        })}
        onClick={onContainerClick}
      >
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full"
          playsInline
        />
        {children}
      </div>
    )
  }
)

VideoContainer.displayName = 'VideoContainer'

export default VideoContainer
