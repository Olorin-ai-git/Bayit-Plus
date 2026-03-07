import BayitCore
import Foundation

/// Central manager for all BYOC content sources.
/// Observable state holder injected into SwiftUI environment.
@MainActor
@Observable
public final class BYOCSourceManager: @unchecked Sendable {
    let logger = BayitLogger(category: "BYOCSourceManager")

    public internal(set) var sources: [BYOCSourceConfig] = []
    public internal(set) var iptvChannels: [BYOCChannel] = []
    public internal(set) var iptvGroups: [BYOCChannelGroup] = []
    public internal(set) var plexItems: [BYOCContentItem] = []
    public internal(set) var youtubeItems: [BYOCContentItem] = []
    public internal(set) var isRefreshing = false
    public internal(set) var lastError: String?

    public var hasAnySources: Bool {
        !sources.isEmpty
    }

    public var hasIPTV: Bool {
        sources.contains { $0.type == .iptv }
    }

    public var hasPlex: Bool {
        sources.contains { $0.type == .plex }
    }

    public var hasYouTube: Bool {
        sources.contains { $0.type == .youtube }
    }

    public init() {
        sources = BYOCSourceStore.loadSources()
    }

    // MARK: - IPTV

    public func addIPTVSource(name: String, url: URL) async throws {
        let config = BYOCSourceConfig(
            type: .iptv,
            name: name,
            url: url
        )
        let channels = try await M3UPlaylistFetcher.fetch(
            url: url,
            sourceId: config.id
        )
        sources.append(config)
        iptvChannels.append(contentsOf: channels)
        iptvGroups = M3UParser.groupChannels(iptvChannels)
        BYOCSourceStore.saveSources(sources)
        logger.info(
            "Added IPTV source",
            context: ["name": name, "channels": "\(channels.count)"]
        )
    }

    // MARK: - Plex

    public func addPlexSource(
        name: String,
        server: PlexServer,
        authToken: String
    ) async throws {
        let config = BYOCSourceConfig(
            type: .plex,
            name: name,
            url: URL(string: server.baseURL)
        )
        _ = BYOCKeychainStore.storeToken(authToken, forSourceId: config.id)

        let client = PlexAPIClient(
            authToken: authToken,
            clientId: plexClientId
        )
        let libraries = try await client.fetchLibraries(server: server)

        var allItems: [BYOCContentItem] = []
        for lib in libraries {
            let mediaItems = try await client.fetchLibraryItems(
                server: server,
                libraryId: lib.id
            )
            let converted = PlexContentAdapter.adaptAll(
                items: mediaItems,
                server: server,
                sourceId: config.id,
                authToken: authToken
            )
            allItems.append(contentsOf: converted)
        }

        sources.append(config)
        plexItems.append(contentsOf: allItems)
        BYOCSourceStore.saveSources(sources)
        logger.info(
            "Added Plex source",
            context: ["name": name, "items": "\(allItems.count)"]
        )
    }

    /// The Plex client identifier (stable per device).
    public var plexClientId: String {
        let key = "tv.bayit.plus.byoc.plex.clientId"
        if let existing = UserDefaults.standard.string(forKey: key) {
            return existing
        }
        let newId = UUID().uuidString
        UserDefaults.standard.set(newId, forKey: key)
        return newId
    }

    // MARK: - Source Removal

    public func removeSource(id: String) {
        let sourceType = sources.first { $0.id == id }?.type
        sources.removeAll { $0.id == id }

        switch sourceType {
        case .iptv:
            iptvChannels.removeAll { $0.sourceId == id }
            iptvGroups = M3UParser.groupChannels(iptvChannels)
        case .plex:
            plexItems.removeAll { $0.sourceId == id }
            BYOCKeychainStore.deleteToken(forSourceId: id)
        case .youtube:
            youtubeItems.removeAll { $0.sourceId == id }
            BYOCKeychainStore.deleteToken(forSourceId: id)
        case nil:
            break
        }
        BYOCSourceStore.saveSources(sources)
        logger.info("Removed BYOC source", context: ["id": id])
    }

    /// Check if a stream URL belongs to a BYOC source.
    public func isBYOCStream(url: URL) -> Bool {
        iptvChannels.contains { $0.streamURL == url }
            || plexItems.contains { $0.streamURL == url }
    }

    /// Get capabilities for a stream URL.
    public func capabilities(for url: URL) -> BYOCCapabilities {
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
