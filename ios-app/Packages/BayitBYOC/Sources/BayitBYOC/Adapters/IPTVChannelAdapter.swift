import Foundation

/// Converts BYOCChannel (from M3U parsing) to the app's LiveChannelItem format.
/// Uses a dictionary representation since LiveChannelItem is defined in the app target.
public enum IPTVChannelAdapter {
    /// Creates a LiveChannelItem-compatible dictionary from a BYOCChannel.
    /// The app target can use this to construct a LiveChannelItem.
    public static func toLiveChannelFields(
        _ channel: BYOCChannel
    ) -> IPTVChannelInfo {
        IPTVChannelInfo(
            id: channel.id,
            name: channel.name,
            logo: channel.logoURL?.absoluteString,
            group: channel.group,
            streamURL: channel.streamURL.absoluteString,
            sourceId: channel.sourceId
        )
    }
}

/// Lightweight struct carrying IPTV channel info for the view layer.
public struct IPTVChannelInfo: Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let logo: String?
    public let group: String
    public let streamURL: String
    public let sourceId: String
}
