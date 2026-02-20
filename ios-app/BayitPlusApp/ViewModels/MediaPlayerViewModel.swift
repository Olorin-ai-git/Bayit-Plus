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

    private(set) var isLoading = true
    private(set) var errorMessage: String?
    private(set) var title: String?
    private(set) var subtitle: String?
    private(set) var artworkURL: URL?
    private(set) var initialPosition: TimeInterval = 0
    private(set) var availableQualities: [QualityVariant] = []
    private(set) var currentQuality: String?
    private(set) var availableSubtitleLanguages: [String] = []

    /// The URL currently loaded in the AVPlayer, used to initiate an offline download.
    var currentStreamURL: URL? {
        (player.avPlayer.currentItem?.asset as? AVURLAsset)?.url
    }

    let player: MediaPlayer
    let contentId: String
    let contentType: ContentType

    // MARK: - Private

    private let streamResolver: StreamResolver
    private let progressTracker: ProgressTracker
    #if os(iOS)
    private let widgetBridge: MediaPlayerWidgetBridge
    #endif
    private let repository: any MediaRepository
    #if os(iOS)
    private let downloadManager: DownloadManager?
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
        widgetSync: WidgetDataSyncService? = nil,
        downloadManager: DownloadManager? = nil
    ) {
        self.contentId = contentId
        self.contentType = contentType
        self.player = player
        self.repository = repository
        self.downloadManager = downloadManager
        self.streamResolver = StreamResolver(
            mediaRepository: repository,
            contentRepository: contentRepository,
            liveTVRepository: liveTVRepository,
            radioRepository: radioRepository,
            podcastRepository: podcastRepository
        )
        self.progressTracker = ProgressTracker(
            repository: repository,
            player: player,
            contentId: contentId,
            contentType: contentType,
            intervalSeconds: 15
        )
        let sync = widgetSync ?? WidgetDataSyncService()
        self.widgetBridge = MediaPlayerWidgetBridge(
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
        podcastRepository: any PodcastRepository
    ) {
        self.contentId = contentId
        self.contentType = contentType
        self.player = player
        self.repository = repository
        self.streamResolver = StreamResolver(
            mediaRepository: repository,
            contentRepository: contentRepository,
            liveTVRepository: liveTVRepository,
            radioRepository: radioRepository,
            podcastRepository: podcastRepository
        )
        self.progressTracker = ProgressTracker(
            repository: repository,
            player: player,
            contentId: contentId,
            contentType: contentType,
            intervalSeconds: 15
        )
    }
    #endif

    // MARK: - Loading

    /// Load content metadata and stream URL, then begin playback.
    @MainActor
    func load() async {
        isLoading = true
        errorMessage = nil

        #if os(iOS)
        // Offline-first: use locally downloaded asset when available (no network needed).
        if let download = downloadManager?.localDownload(for: contentId),
           let localURL = downloadManager?.playLocalDownload(id: download.id) {
            title = download.title
            if let thumbStr = download.thumbnail { artworkURL = URL(string: thumbStr) }
            let mediaType = mapContentType(contentType)
            player.load(url: localURL, contentType: mediaType)
            isLoading = false
            await progressTracker.loadResumePosition()
            initialPosition = progressTracker.initialPosition
            player.play()
            if initialPosition > 0 { await player.seek(to: initialPosition) }
            if mediaType.isSeekable { progressTracker.startTracking() }
            return
        }
        #endif

        do {
            // Resolve stream URL and metadata
            let resolved = try await streamResolver.resolveStream(
                contentId: contentId,
                contentType: contentType
            )

            // Update view model state
            title = resolved.title
            subtitle = resolved.subtitle
            artworkURL = resolved.artworkURL
            currentQuality = resolved.quality
            availableQualities = resolved.availableQualities
            availableSubtitleLanguages = resolved.availableSubtitles

            // Load resume position
            await progressTracker.loadResumePosition()
            initialPosition = progressTracker.initialPosition

            // Load and play
            let mediaType = mapContentType(contentType)
            player.load(url: resolved.url, contentType: mediaType)

            isLoading = false

            // Auto-play after loading
            player.play()

            // Restore saved playback rate
            let savedRate = preferences.preferredPlaybackRate
            if savedRate != 1.0 {
                player.setRate(savedRate)
            }

            // Apply preferred quality if different from resolved
            let savedQuality = preferences.preferredQuality
            if savedQuality != PlayerPreferencesService.Defaults.quality, savedQuality != currentQuality {
                Task { await switchQuality(savedQuality) }
            }

            // Immediately sync playback to widgets
            #if os(iOS)
            await syncToWidgets()
            #endif

            // Seek to resume position if available
            if initialPosition > 0 {
                await player.seek(to: initialPosition)
            }

            // Start periodic progress tracking for seekable content
            if mediaType.isSeekable {
                progressTracker.startTracking()
            }
        } catch let error as StreamResolutionError {
            errorMessage = error.errorDescription
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    // MARK: - Playback Control

    /// Manually sync current playback state to widgets.
    /// Call this after toggling play/pause from UI controls.
    @MainActor
    func syncPlaybackState() async {
        #if os(iOS)
        await syncToWidgets()
        #endif
    }

    // MARK: - Quality

    /// Switch stream quality and persist preference.
    @MainActor
    func switchQuality(_ quality: String) async {
        guard quality != currentQuality else { return }
        let currentPos = player.currentTime
        currentQuality = quality
        preferences.preferredQuality = quality

        do {
            let stream = try await repository.fetchStream(
                contentId: contentId,
                quality: quality
            )
            guard let urlStr = stream.url, let url = URL(string: urlStr) else { return }

            let mediaType = mapContentType(contentType)
            player.load(url: url, contentType: mediaType)
            player.play()
            await player.seek(to: currentPos)

            // Sync quality change to widgets
            #if os(iOS)
            await syncToWidgets()
            #endif
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Cleanup

    /// Stop playback and save final progress.
    @MainActor
    func cleanup() async {
        await progressTracker.stopTracking()
        player.stop()
        #if os(iOS)
        await widgetBridge.clearNowPlaying()
        #endif
    }

    // MARK: - Private

    private func mapContentType(_ type: ContentType) -> MediaContentType {
        switch type {
        case .live, .liveTV: return .liveTV
        case .movie, .series, .episode: return .vod
        case .radio: return .radio
        case .podcast: return .podcast
        case .audiobook: return .audiobook
        }
    }

    #if os(iOS)
    /// Sync current playback state to widgets immediately.
    @MainActor
    private func syncToWidgets() async {
        guard let title = title else { return }
        await widgetBridge.syncNow(
            contentID: contentId,
            contentType: contentType,
            title: title,
            subtitle: subtitle,
            artworkURL: artworkURL
        )
    }
    #endif
}
