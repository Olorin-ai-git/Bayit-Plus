/**
 * Player components barrel exports
 */

export { default as VideoPlayer } from './VideoPlayer'
export { default as AudioPlayer } from './AudioPlayer'
export { default as PlayerControls } from './PlayerControls'
export { default as ProgressBar } from './ProgressBar'
export { default as SettingsPanel } from './SettingsPanel'
export { default as SubtitleOverlay } from './SubtitleOverlay'
export { default as SubtitleControls } from './SubtitleControls'
export { default as LiveSubtitleOverlay } from './LiveSubtitleOverlay'
export { default as LiveSubtitleControls } from './LiveSubtitleControls'
export { DubbingControls, DubbingOverlay } from './dubbing'
export { default as ChaptersPanel } from './ChaptersPanel'
export { default as ChapterCard } from './ChapterCard'
export { default as ChapterTimeline } from './ChapterTimeline'
export { RecordButton } from './RecordButton'
export { RecordingStatusIndicator } from './RecordingStatusIndicator'
export { default as FullscreenVideoOverlay } from './FullscreenVideoOverlay'
export { default as TriviaOverlay } from './TriviaOverlay'

// Export types
export type { Chapter, VideoPlayerProps, PlayerState, PlayerControls as PlayerControlsType } from './types'

// Export hooks
export * from './hooks'
