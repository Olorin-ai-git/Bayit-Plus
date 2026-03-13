import BayitBYOC
import Foundation

/// Maps BYOC content to the format PlayerView requires for navigation.
enum BYOCPlayerAdapter {
    /// Returns the contentId and contentType needed by Route.player.
    /// YouTube items use the video ID extracted from the streamURL
    /// (`https://www.youtube.com/watch?v={videoId}`), since the player
    /// passes this directly to the YouTube IFrame API.
    static func playerRoute(
        for item: BYOCContentItem,
        enrichment: BYOCEnrichmentResult?
    ) -> (contentId: String, contentType: ContentType)? {
        let mappedType = mapContentType(item.contentType)
        let contentId: String
        switch mappedType {
        case .youtubeVOD, .youtubeLive:
            contentId = extractYouTubeVideoId(from: item.streamURL) ?? item.id
        default:
            contentId = enrichment?.contentId ?? item.id
        }
        return (contentId: contentId, contentType: mappedType)
    }

    /// Extract the YouTube video ID from the stream URL query parameter `v`.
    private static func extractYouTubeVideoId(from url: URL?) -> String? {
        guard let url else { return nil }
        return URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "v" })?
            .value
    }

    private static func mapContentType(
        _ byocType: BYOCContentType
    ) -> ContentType {
        switch byocType {
        case .movie: .movie
        case .series: .series
        case .episode: .episode
        case .video: .movie
        case .liveChannel: .liveTV
        case .youtubeVOD: .youtubeVOD
        case .youtubeLive: .youtubeLive
        }
    }
}
