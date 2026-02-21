import AVFoundation
import BayitMedia
#if os(iOS)
    import BayitWidgetShared
#endif
import Foundation
import Observation

/// ViewModel coordinating media playback, stream loading, and watch history.
/// Orchestrates StreamResolver, ProgressTracker, and MediaPlayerWidgetBridge.
@MainActor
@Observable
final class MediaPlayerViewModel {
    // MARK: - Observable State

    var isLoading = true
    var errorMessage: String?
    var title: String?
    var subtitle: String?
    var artworkURL: URL?
    var initialPosition: TimeInterval = 0
    var availableQualities: [QualityVariant] = []
    var currentQuality: String?
    var availableSubtitleLanguages: [String] = []

    /// The URL currently loaded in the AVPlayer, used to initiate an offline download.
    var currentStreamURL: URL? {
        (player.avPlayer.currentItem?.asset as? AVURLAsset)?.url
    }

    let player: MediaPlayer
    let contentId: String
    let contentType: ContentType

    // MARK: - Internal (for extensions)

    let streamResolver: StreamResolver
    let progressTracker: ProgressTracker
    #if os(iOS)
        let widgetBridge: MediaPlayerWidgetBridge
    #endif
    let repository: any MediaRepository
    #if os(iOS)
        let downloadManager: DownloadManager?
    #endif
    let preferences = PlayerPreferencesService()

    // MARK: - Init

    #if os(iOS)
        init(
            contentId: String,
            contentType: ContentType,
            player: MediaPlayer,
            repository: any MediaRepository,
            contentRepository: any ContentRepository,
            liveTVRepository: any LiveTVRepository,
            radioRepository: any RadioRepository,
            podcastRepository: any PodcastRepository,
            audiobookRepository: any AudiobookRepository,
            widgetSync: WidgetDataSyncService? = nil,
            downloadManager: DownloadManager? = nil,
            progressIntervalSeconds: TimeInterval
        ) {
            self.contentId = contentId
            self.contentType = contentType
            self.player = player
            self.repository = repository
            self.downloadManager = downloadManager
            streamResolver = StreamResolver(
                mediaRepository: repository,
                contentRepository: contentRepository,
                liveTVRepository: liveTVRepository,
                radioRepository: radioRepository,
                podcastRepository: podcastRepository,
                audiobookRepository: audiobookRepository
            )
            progressTracker = ProgressTracker(
                repository: repository,
                player: player,
                contentId: contentId,
                contentType: contentType,
                intervalSeconds: progressIntervalSeconds
            )
            let sync = widgetSync ?? WidgetDataSyncService()
            widgetBridge = MediaPlayerWidgetBridge(
                mediaPlayer: player,
                widgetSync: sync
            )
        }
    #else
        init(
            contentId: String,
            contentType: ContentType,
            player: MediaPlayer,
            repository: any MediaRepository,
            contentRepository: any ContentRepository,
            liveTVRepository: any LiveTVRepository,
            radioRepository: any RadioRepository,
            podcastRepository: any PodcastRepository,
            audiobookRepository: any AudiobookRepository,
            progressIntervalSeconds: TimeInterval
        ) {
            self.contentId = contentId
            self.contentType = contentType
            self.player = player
            self.repository = repository
            streamResolver = StreamResolver(
                mediaRepository: repository,
                contentRepository: contentRepository,
                liveTVRepository: liveTVRepository,
                radioRepository: radioRepository,
                podcastRepository: podcastRepository,
                audiobookRepository: audiobookRepository
            )
            progressTracker = ProgressTracker(
                repository: repository,
                player: player,
                contentId: contentId,
                contentType: contentType,
                intervalSeconds: progressIntervalSeconds
            )
        }
    #endif
}
