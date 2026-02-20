import Foundation

/// Resolves stream URLs for different content types.
/// Handles content-specific stream fetching logic.
@MainActor
struct StreamResolver {

    private let mediaRepository: any MediaRepository
    private let contentRepository: any ContentRepository
    private let liveTVRepository: any LiveTVRepository
    private let radioRepository: any RadioRepository
    private let podcastRepository: any PodcastRepository
    private let audiobookRepository: any AudiobookRepository

    init(
        mediaRepository: any MediaRepository,
        contentRepository: any ContentRepository,
        liveTVRepository: any LiveTVRepository,
        radioRepository: any RadioRepository,
        podcastRepository: any PodcastRepository,
        audiobookRepository: any AudiobookRepository
    ) {
        self.mediaRepository = mediaRepository
        self.contentRepository = contentRepository
        self.liveTVRepository = liveTVRepository
        self.radioRepository = radioRepository
        self.podcastRepository = podcastRepository
        self.audiobookRepository = audiobookRepository
    }

    /// Load content metadata and resolve stream URL for the given content type.
    func resolveStream(
        contentId: String,
        contentType: ContentType
    ) async throws -> ResolvedStream {
        switch contentType {
        case .live, .liveTV:
            return try await resolveLiveStream(contentId: contentId)

        case .radio:
            return try await resolveRadioStream(contentId: contentId)

        case .podcast:
            return try await resolvePodcastStream(contentId: contentId)

        case .movie, .series, .episode:
            return try await resolveVODStream(contentId: contentId, contentType: contentType)

        case .audiobook:
            return try await resolveAudiobookStream(contentId: contentId)
        }
    }

    private func resolveLiveStream(contentId: String) async throws -> ResolvedStream {
        let channel = try await liveTVRepository.fetchChannelDetail(id: contentId)
        let stream = try await mediaRepository.fetchLiveStream(channelId: contentId)

        guard let streamURLStr = stream.url ?? channel.streamUrl,
              !streamURLStr.isEmpty,
              let url = URL(string: streamURLStr) else {
            throw StreamResolutionError.invalidURL
        }

        return ResolvedStream(
            url: url,
            title: channel.name ?? "",
            subtitle: channel.currentShow,
            artworkURL: artworkURL(from: channel.thumbnail ?? channel.logo),
            quality: stream.quality,
            availableQualities: stream.availableQualities ?? [],
            availableSubtitles: []
        )
    }

    private func resolveRadioStream(contentId: String) async throws -> ResolvedStream {
        let station = try await radioRepository.fetchStationDetail(id: contentId)
        let stream = try await mediaRepository.fetchRadioStream(stationId: contentId)

        guard let streamURLStr = stream.url,
              !streamURLStr.isEmpty,
              let url = URL(string: streamURLStr) else {
            throw StreamResolutionError.invalidURL
        }

        return ResolvedStream(
            url: url,
            title: station.name ?? "",
            subtitle: station.currentShow,
            artworkURL: artworkURL(from: station.logo),
            quality: nil,
            availableQualities: [],
            availableSubtitles: []
        )
    }

    private func resolvePodcastStream(contentId: String) async throws -> ResolvedStream {
        let podcast = try await podcastRepository.fetchPodcastDetail(id: contentId)

        let audioURLStr = podcast.episodes?.first?.audioUrl
            ?? podcast.latestEpisode?.audioUrl
            ?? ""

        guard !audioURLStr.isEmpty, let url = URL(string: audioURLStr) else {
            throw StreamResolutionError.noAudioAvailable
        }

        return ResolvedStream(
            url: url,
            title: podcast.episodes?.first?.title ?? podcast.title ?? "",
            subtitle: podcast.title,
            artworkURL: artworkURL(from: podcast.cover),
            quality: nil,
            availableQualities: [],
            availableSubtitles: []
        )
    }

    private func resolveVODStream(
        contentId: String,
        contentType: ContentType
    ) async throws -> ResolvedStream {
        let detail = try await contentRepository.fetchContentDetail(id: contentId)
        let stream = try await mediaRepository.fetchStream(contentId: contentId, quality: nil)

        guard let streamURLStr = stream.url ?? detail.streamUrl,
              !streamURLStr.isEmpty,
              let url = URL(string: streamURLStr) else {
            throw StreamResolutionError.invalidURL
        }

        return ResolvedStream(
            url: url,
            title: detail.title ?? "",
            subtitle: detail.category,
            artworkURL: artworkURL(from: detail.backdrop),
            quality: stream.quality,
            availableQualities: stream.availableQualities ?? [],
            availableSubtitles: detail.availableSubtitleLanguages ?? []
        )
    }

    private func resolveAudiobookStream(contentId: String) async throws -> ResolvedStream {
        let audiobook = try await audiobookRepository.fetchWithChapters(id: contentId)

        // Use first chapter's stream URL, or fall back to parent audiobook's stream URL
        let streamURLStr = audiobook.chapters?.first?.streamUrl
            ?? audiobook.streamUrl

        guard let urlStr = streamURLStr,
              !urlStr.isEmpty,
              let url = URL(string: urlStr) else {
            throw StreamResolutionError.invalidURL
        }

        return ResolvedStream(
            url: url,
            title: audiobook.title ?? "",
            subtitle: audiobook.author,
            artworkURL: artworkURL(from: audiobook.thumbnail ?? audiobook.backdrop),
            quality: nil,
            availableQualities: [],
            availableSubtitles: []
        )
    }

    private func artworkURL(from urlString: String?) -> URL? {
        guard let urlString = urlString else { return nil }
        return URL(string: urlString)
    }
}

/// Result of stream resolution containing all metadata needed for playback.
struct ResolvedStream {
    let url: URL
    let title: String
    let subtitle: String?
    let artworkURL: URL?
    let quality: String?
    let availableQualities: [QualityVariant]
    let availableSubtitles: [String]
}

/// Errors that can occur during stream resolution.
enum StreamResolutionError: LocalizedError {
    case invalidURL
    case noURL
    case noAudioAvailable

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid stream URL"
        case .noURL:
            return "No stream URL available"
        case .noAudioAvailable:
            return "No audio URL available for this episode"
        }
    }
}
