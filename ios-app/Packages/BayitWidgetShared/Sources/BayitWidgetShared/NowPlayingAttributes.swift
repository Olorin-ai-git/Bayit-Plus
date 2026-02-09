import ActivityKit
import Foundation

/// Attributes for the Now Playing Live Activity on the Lock Screen and Dynamic Island.
///
/// Defined in BayitWidgetShared so both the main app (LiveActivityManager)
/// and the widget extension (Live Activity views) can reference them.
public struct NowPlayingAttributes: ActivityAttributes {
    public let channelName: String
    public let channelLogoURL: URL?

    public struct ContentState: Codable, Hashable {
        public let showTitle: String
        public let isPlaying: Bool
        public let progress: Double

        public init(showTitle: String, isPlaying: Bool, progress: Double) {
            self.showTitle = showTitle
            self.isPlaying = isPlaying
            self.progress = progress
        }
    }

    public init(channelName: String, channelLogoURL: URL?) {
        self.channelName = channelName
        self.channelLogoURL = channelLogoURL
    }
}
