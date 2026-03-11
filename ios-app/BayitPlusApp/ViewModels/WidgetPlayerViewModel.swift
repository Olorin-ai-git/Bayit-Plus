import BayitCore
import BayitLocalization
import BayitMedia
import Foundation
import Observation

/// Lightweight view model managing media playback and cover art for a single floating widget.
/// Handles stream URL resolution per content type and playback lifecycle.
@MainActor
@Observable
final class WidgetPlayerViewModel {
    let player = MediaPlayer()
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var resolvedCoverURL: URL?

    let mediaRepo: any MediaRepository
    let contentRepo: any ContentRepository
    let liveTVRepo: any LiveTVRepository
    let radioRepo: any RadioRepository
    let podcastRepo: any PodcastRepository
    let audiobookRepo: any AudiobookRepository
    private let localization: LocalizationManager
    private let logger = BayitLogger(category: "WidgetPlayer")

    init(
        mediaRepo: any MediaRepository,
        contentRepo: any ContentRepository,
        liveTVRepo: any LiveTVRepository,
        radioRepo: any RadioRepository,
        podcastRepo: any PodcastRepository,
        audiobookRepo: any AudiobookRepository,
        localization: LocalizationManager
    ) {
        self.mediaRepo = mediaRepo
        self.contentRepo = contentRepo
        self.liveTVRepo = liveTVRepo
        self.radioRepo = radioRepo
        self.podcastRepo = podcastRepo
        self.audiobookRepo = audiobookRepo
        self.localization = localization
    }

    var isPlaying: Bool {
        player.state == .playing
    }

    /// Resolve cover art URL from widget data or content APIs.
    @MainActor
    func resolveCover(for widget: WidgetItem) async {
        if let existing = widget.coverUrl, let url = URL(string: existing) {
            resolvedCoverURL = url
            return
        }
        if let icon = widget.icon, let url = URL(string: icon) {
            resolvedCoverURL = url
            return
        }

        do {
            let urlString = try await fetchCoverFromAPI(for: widget)
            if let url = URL(string: urlString) {
                resolvedCoverURL = url
            }
        } catch {
            logger.debug(
                "Cover resolution skipped",
                context: ["widgetId": widget.id, "reason": error.localizedDescription]
            )
        }
    }

    /// Toggle playback: resolve stream on first tap, then toggle play/pause.
    @MainActor
    func togglePlayback(widget: WidgetItem) async {
        if player.state.canPlay || player.state == .playing {
            player.togglePlayPause()
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let (urlString, mediaType) = try await resolveStream(for: widget)
            guard let url = URL(string: urlString) else {
                errorMessage = localization.t("errors.invalidStreamUrl")
                isLoading = false
                return
            }

            player.load(url: url, contentType: mediaType)
            isLoading = false
            // Call avPlayer.play() directly because player.play() guards on
            // state.canPlay which excludes .loading. AVPlayer handles pre-ready
            // playback natively and KVO observers update state when playing begins.
            player.avPlayer.play()

            logger.info(
                "Widget playback started",
                context: ["widgetId": widget.id, "contentType": mediaType.rawValue]
            )
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            logger.error(
                "Widget stream failed",
                context: ["widgetId": widget.id, "error": error.localizedDescription]
            )
        }
    }

    func skipForward() async {
        await player.skipForward()
    }

    func skipBackward() async {
        await player.skipBackward()
    }

    func toggleMute() {
        player.avPlayer.isMuted.toggle()
    }

    var isMuted: Bool {
        player.avPlayer.isMuted
    }

    func cleanup() {
        player.stop()
    }
}

/// Errors during widget stream resolution.
enum WidgetStreamError: LocalizedError {
    case noContent
    case nonPlayable
    case missingId(String)
    case noStream

    var errorDescription: String? {
        switch self {
        case .noContent: return "No content configured"
        case .nonPlayable: return "Content type does not support playback"
        case let .missingId(field): return "Missing \(field) in widget content"
        case .noStream: return "No stream available"
        }
    }
}
