// Player components
export { ChapterItem } from './ChapterItem';
export type { Chapter } from './ChapterItem';
export { ChaptersOverlay } from './ChaptersOverlay';
export { QualitySelector, useQualityPreference } from './QualitySelector';
export type { QualityLevel, QualitySelectorProps } from './QualitySelector';
export { SubtitleSettings, useSubtitlePreferences } from './SubtitleSettings';
export type {
  SubtitleFontSize,
  SubtitleColor,
  SubtitlePosition,
  SubtitlePreferences,
  SubtitleSettingsProps,
} from './SubtitleSettings';
export { AudioTrackSelector } from './AudioTrackSelector';
export type { AudioTrack, AudioTrackSelectorProps } from './AudioTrackSelector';
export {
  PlaybackSpeedControl,
  usePlaybackSpeedPreference,
  isPlaybackSpeedSupported,
} from './PlaybackSpeedControl';
export type { PlaybackSpeed, PlaybackSpeedControlProps } from './PlaybackSpeedControl';
