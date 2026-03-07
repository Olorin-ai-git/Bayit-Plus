import Foundation

/// A channel parsed from an M3U IPTV playlist.
public struct BYOCChannel: Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let logoURL: URL?
    public let group: String
    public let streamURL: URL
    public let sourceId: String
    public let attributes: [String: String]

    public init(
        name: String,
        logoURL: URL?,
        group: String,
        streamURL: URL,
        sourceId: String,
        attributes: [String: String] = [:]
    ) {
        id = "\(sourceId)_\(streamURL.absoluteString.hashValue)"
        self.name = name
        self.logoURL = logoURL
        self.group = group
        self.streamURL = streamURL
        self.sourceId = sourceId
        self.attributes = attributes
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    public static func == (lhs: BYOCChannel, rhs: BYOCChannel) -> Bool {
        lhs.id == rhs.id
    }
}

/// Channels organized by group name.
public struct BYOCChannelGroup: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let channels: [BYOCChannel]

    public init(name: String, channels: [BYOCChannel]) {
        id = name
        self.name = name
        self.channels = channels
    }
}
