import BayitMedia
import Foundation

/// Maps API content type strings to `MediaContentType` for tvOS navigation.
/// Used by TVHomeView, TVSearchView, and other screens with mixed content.
enum TVContentTypeMapper {

    /// Map an API content type string to a `MediaContentType`.
    /// Returns `.vod` as the default for unknown types.
    static func map(_ apiType: String?) -> MediaContentType {
        guard let type = apiType?.lowercased() else { return .vod }
        switch type {
        case "live", "livetv", "live_tv", "channel":
            return .liveTV
        case "vod", "movie", "series", "film":
            return .vod
        case "podcast", "podcast_episode":
            return .podcast
        case "radio", "radio_station":
            return .radio
        case "audiobook", "audiobook_chapter":
            return .audiobook
        default:
            return .vod
        }
    }
}
