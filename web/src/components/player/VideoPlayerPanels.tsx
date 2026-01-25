import ChaptersPanel from './ChaptersPanel'
import SceneSearchPanel from './SceneSearchPanel'
import SettingsPanel from './SettingsPanel'
import { Chapter } from '@/types/media'

interface VideoPlayerPanelsProps {
  // Common
  isLive: boolean
  videoRef: React.RefObject<HTMLVideoElement>

  // Chapters
  showChaptersPanel: boolean
  chapters: Chapter[]
  chaptersLoading: boolean
  currentTime: number
  duration: number
  onChaptersClose: () => void
  onSeek: (time: number) => void

  // Scene Search
  showSceneSearchPanel: boolean
  contentId?: string
  onSceneSearchClose: () => void

  // Settings
  showSettings: boolean
  availableSubtitleLanguages: string[]
  liveSubtitleLang: string
  availableQualities: string[]
  currentQuality: string
  currentPlaybackSpeed: number
  onSettingsClose: () => void
  onLiveSubtitleLangChange: (lang: string) => void
  onQualityChange: (quality: string) => void
  onPlaybackSpeedChange: (speed: number) => void
}

export default function VideoPlayerPanels({
  isLive,
  videoRef,
  showChaptersPanel,
  chapters,
  chaptersLoading,
  currentTime,
  duration,
  onChaptersClose,
  onSeek,
  showSceneSearchPanel,
  contentId,
  onSceneSearchClose,
  showSettings,
  availableSubtitleLanguages,
  liveSubtitleLang,
  availableQualities,
  currentQuality,
  currentPlaybackSpeed,
  onSettingsClose,
  onLiveSubtitleLangChange,
  onQualityChange,
  onPlaybackSpeedChange,
}: VideoPlayerPanelsProps) {
  return (
    <>
      {/* Chapters Panel (VOD only) */}
      {!isLive && chapters.length > 0 && (
        <ChaptersPanel
          chapters={chapters}
          currentTime={currentTime}
          duration={duration}
          isLoading={chaptersLoading}
          isOpen={showChaptersPanel}
          onClose={onChaptersClose}
          onSeek={onSeek}
        />
      )}

      {/* Scene Search Panel (VOD only) */}
      {!isLive && contentId && (
        <SceneSearchPanel
          contentId={contentId}
          isOpen={showSceneSearchPanel}
          onClose={onSceneSearchClose}
          onSeek={onSeek}
        />
      )}

      {/* Settings Panel (VOD only) */}
      {!isLive && (
        <SettingsPanel
          isOpen={showSettings}
          isLive={isLive}
          videoRef={videoRef}
          availableSubtitleLanguages={availableSubtitleLanguages}
          liveSubtitleLang={liveSubtitleLang}
          availableQualities={availableQualities}
          currentQuality={currentQuality}
          currentPlaybackSpeed={currentPlaybackSpeed}
          onClose={onSettingsClose}
          onLiveSubtitleLangChange={onLiveSubtitleLangChange}
          onQualityChange={onQualityChange}
          onPlaybackSpeedChange={onPlaybackSpeedChange}
        />
      )}
    </>
  )
}
