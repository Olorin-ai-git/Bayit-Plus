import BayitBYOC
import Foundation

/// Maps BYOC content to the format PlayerView requires for navigation.
enum BYOCPlayerAdapter {
    /// Returns the contentId and contentType needed by Route.player,
    /// or nil if enrichment has not completed yet.
    static func playerRoute(
        for item: BYOCContentItem,
        enrichment: BYOCEnrichmentResult?
    ) -> (contentId: String, contentType: ContentType)? {
        guard let enrichment else { return nil }
        return (
            contentId: enrichment.contentId,
            contentType: mapContentType(item.contentType)
        )
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
