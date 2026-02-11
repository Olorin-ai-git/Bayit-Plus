import BayitCore
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

    private let mediaRepo: any MediaRepository
    private let contentRepo: any ContentRepository
    private let liveTVRepo: any LiveTVRepository
    private let radioRepo: any RadioRepository
    private let podcastRepo: any PodcastRepository
    private let logger = BayitLogger(category: "WidgetPlayer")

    init(
        mediaRepo: any MediaRepository,
        contentRepo: any ContentRepository,
        liveTVRepo: any LiveTVRepository,
        radioRepo: any RadioRepository,
        podcastRepo: any PodcastRepository
    ) {
        self.mediaRepo = mediaRepo
        self.contentRepo = contentRepo
        self.liveTVRepo = liveTVRepo
        self.radioRepo = radioRepo
        self.podcastRepo = podcastRepo
    }

    var isPlaying: Bool { player.state == .playing }

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
                errorMessage = "Invalid stream URL"
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

    func skipForward() async { await player.skipForward() }
    func skipBackward() async { await player.skipBackward() }

    func toggleMute() { player.avPlayer.isMuted.toggle() }
    var isMuted: Bool { player.avPlayer.isMuted }

    func cleanup() { player.stop() }

    // MARK: - Private - Cover Resolution

    private func fetchCoverFromAPI(for widget: WidgetItem) async throws -> String {
        guard let content = widget.content, let contentType = content.contentType else {
            throw WidgetStreamError.noContent
        }

        switch contentType {
        case .liveChannel, .live:
            guard let channelId = content.liveChannelId ?? content.contentId else {
                throw WidgetStreamError.missingId("live_channel_id")
            }
            let detail = try await liveTVRepo.fetchChannelDetail(id: channelId)
            return detail.thumbnail ?? detail.logo ?? ""

        case .radio:
            guard let stationId = content.stationId ?? content.contentId else {
                throw WidgetStreamError.missingId("station_id")
            }
            let detail = try await radioRepo.fetchStationDetail(id: stationId)
            return detail.logo ?? ""

        case .podcast:
            guard let podcastId = content.podcastId ?? content.contentId else {
                throw WidgetStreamError.missingId("podcast_id")
            }
            let detail = try await podcastRepo.fetchPodcastDetail(id: podcastId)
            return detail.cover ?? ""

        case .vod:
            guard let id = content.contentId else {
                throw WidgetStreamError.missingId("content_id")
            }
            let detail = try await contentRepo.fetchContentDetail(id: id)
            return detail.thumbnail ?? detail.backdrop ?? ""

        case .audiobook:
            guard let id = content.audiobookId ?? content.contentId else {
                throw WidgetStreamError.missingId("audiobook_id")
            }
            let detail = try await contentRepo.fetchContentDetail(id: id)
            return detail.thumbnail ?? detail.backdrop ?? ""

        case .iframe, .custom:
            return ""
        }
    }

    // MARK: - Private - Stream Resolution

    private func resolveStream(
        for widget: WidgetItem
    ) async throws -> (String, MediaContentType) {
        guard let content = widget.content,
              let contentType = content.contentType
        else {
            throw WidgetStreamError.noContent
        }

        switch contentType {
        case .liveChannel, .live:
            guard let channelId = content.liveChannelId ?? content.contentId else {
                throw WidgetStreamError.missingId("live_channel_id")
            }
            let stream = try await mediaRepo.fetchLiveStream(channelId: channelId)
            return (stream.url ?? stream.directUrl ?? "", .liveTV)

        case .radio:
            guard let stationId = content.stationId ?? content.contentId else {
                throw WidgetStreamError.missingId("station_id")
            }
            let stream = try await mediaRepo.fetchRadioStream(stationId: stationId)
            return (stream.url ?? "", .radio)

        case .vod:
            guard let id = content.contentId else {
                throw WidgetStreamError.missingId("content_id")
            }
            let stream = try await mediaRepo.fetchStream(contentId: id, quality: nil)
            return (stream.url ?? stream.directUrl ?? "", .vod)

        case .podcast:
            // Match web: fetch podcast show, get latest episode, use episode audio URL
            guard let podcastId = content.podcastId ?? content.contentId else {
                throw WidgetStreamError.missingId("podcast_id")
            }
            let episodes = try await podcastRepo.fetchEpisodes(
                showId: podcastId, page: 1, limit: 1
            )
            guard let episode = episodes.episodes.first,
                  let audioUrl = episode.audioUrl
            else {
                throw WidgetStreamError.noStream
            }
            return (audioUrl, .podcast)

        case .audiobook:
            guard let id = content.audiobookId ?? content.contentId else {
                throw WidgetStreamError.missingId("audiobook_id")
            }
            let stream = try await mediaRepo.fetchStream(contentId: id, quality: nil)
            return (stream.url ?? stream.directUrl ?? "", .audiobook)

        case .iframe, .custom:
            throw WidgetStreamError.nonPlayable
        }
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
        case .missingId(let field): return "Missing \(field) in widget content"
        case .noStream: return "No stream available"
        }
    }
}
