#if os(tvOS)
    import Foundation
    import GroupActivities

    /// GroupActivity for synchronized Bayit+ content viewing via SharePlay.
    /// Carries content metadata so all participants load the same media.
    struct BayitWatchActivity: GroupActivity {
        let contentId: String
        let contentType: String
        let contentTitle: String

        static let activityIdentifier = "tv.bayit.shareplay.watch"

        var metadata: GroupActivityMetadata {
            var meta = GroupActivityMetadata()
            meta.title = contentTitle
            meta.type = .watchTogether
            meta.fallbackURL = URL(string: "https://bayit.tv/watch/\(contentId)")
            return meta
        }
    }

    // MARK: - Sync Messages

    /// Playback state message sent between SharePlay participants.
    struct SharePlayPlaybackMessage: Codable, Sendable {
        let action: SharePlayAction
        let position: Double
        let timestamp: Double
        let senderId: String
    }

    /// Actions that can be synchronized across a SharePlay session.
    enum SharePlayAction: String, Codable, Sendable {
        case play
        case pause
        case seek
        case contentChanged
    }

    /// Content change message when the host switches to different content.
    struct SharePlayContentMessage: Codable, Sendable {
        let contentId: String
        let contentType: String
        let contentTitle: String
    }
#endif
