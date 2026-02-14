/**
 * Player Components Export
 */

export { default as MobileVideoPlayer } from './MobileVideoPlayer';
export { default as MobileAudioPlayer } from './MobileAudioPlayer';
export { ChapterListMobile } from './ChapterListMobile';
export { ChapterMarkers } from './ChapterMarkers';
export type { Chapter } from './ChapterListMobile';

// Cultural Context
export {
  CulturalExplanationSheet,
  CulturalContextBadge,
  ShoreshHighlight,
  TranslationPopover,
} from './cultural';
export type { CulturalExplanation } from './cultural';

// Scene Search
export { SceneSearch } from './SceneSearch';

// Catch-up
export { CatchUpView, CatchUpSummary, CatchUpAutoPrompt } from './catchup';

// TalkBack
export { TalkBackOverlay, TalkBackResult, TalkBackCharacter } from './talkback';
export type { TalkBackCharacterData } from './talkback';

// Channel Chat
export { ChannelChat } from './ChannelChat';

// Stream Limit
export { StreamLimitExceeded } from './StreamLimitExceeded';
export type { ActiveDevice } from './StreamLimitExceeded';

// OpenSubtitles
export { OpenSubtitlesDownload } from './OpenSubtitlesDownload';

// AI Companion
export {
  AICompanionSidebar,
  CompanionContextTab,
  CompanionQuizTab,
  CompanionVocabularyTab,
} from './ai-companion';

// Subtitles
export {
  AISubtitlesPicker,
  SplitSubtitleLanguagePicker,
  SplitSubtitleOverlay,
  LiveSplitSubtitleOverlay,
  SubtitlePane,
  InteractiveSubtitlesOverlay,
  LiveSubtitleOverlay,
} from './subtitles';

// Dubbing
export {
  BilingualDubbingOverlay,
  VoiceSelector,
  LanguageRatio,
  DubbingPremiumGate,
  LiveDubbingOverlayMobile,
  LiveDubbingControlsMobile,
} from './dubbing';
