import BayitCore
import BayitMedia
import Foundation

// MARK: - Stream & Cover Resolution

extension WidgetPlayerViewModel {
    func fetchCoverFromAPI(for widget: WidgetItem) async throws -> String {
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
            let audiobook = try await audiobookRepo.fetchDetail(id: id)
            return audiobook.thumbnail ?? audiobook.backdrop ?? ""

        case .iframe, .custom:
            return ""
        }
    }

    func resolveStream(
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
            return (stream.resolvedURL ?? "", .liveTV)

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
            return (stream.resolvedURL ?? "", .vod)

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
            let audiobook = try await audiobookRepo.fetchWithChapters(id: id)
            let url = audiobook.chapters?.first?.streamUrl
                ?? audiobook.streamUrl ?? ""
            return (url, .audiobook)

        case .iframe, .custom:
            throw WidgetStreamError.nonPlayable
        }
    }
}
