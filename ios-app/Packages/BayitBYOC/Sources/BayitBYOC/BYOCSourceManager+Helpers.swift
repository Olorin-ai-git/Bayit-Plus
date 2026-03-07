import Foundation

public extension BYOCSourceManager {
    /// The Plex client identifier (stable per device).
    var plexClientId: String {
        let key = "tv.bayit.plus.byoc.plex.clientId"
        if let existing = UserDefaults.standard.string(forKey: key) {
            return existing
        }
        let newId = UUID().uuidString
        UserDefaults.standard.set(newId, forKey: key)
        return newId
    }

    /// Check if a stream URL belongs to a BYOC source.
    func isBYOCStream(url: URL) -> Bool {
        iptvChannels.contains { $0.streamURL == url }
            || plexItems.contains { $0.streamURL == url }
            || youtubeItems.contains { $0.streamURL == url }
    }

    /// Get capabilities for a stream URL.
    func capabilities(for url: URL) -> BYOCCapabilities {
        if iptvChannels.contains(where: { $0.streamURL == url }) {
            return .capabilities(for: .iptv)
        }
        if plexItems.contains(where: { $0.streamURL == url }) {
            return .capabilities(for: .plex)
        }
        if youtubeItems.contains(where: { $0.streamURL == url }) {
            return .capabilities(for: .youtube)
        }
        return .none
    }
}
