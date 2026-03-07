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
    public private(set) var enrichmentQueue: BYOCEnrichmentQueue?

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
        if !sources.isEmpty {
            Task { await refreshAll() }
        }
    }

    public func configureEnrichment(baseURL: URL) {
        let service = BYOCEnrichmentService(baseURL: baseURL)
        enrichmentQueue = BYOCEnrichmentQueue(service: service)
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
        Task { await triggerInitialEnrichment(items: allItems) }
    }

    // MARK: - YouTube

    public func addYouTubeSource(
        name: String,
        accessToken: String,
        refreshToken _: String?
    ) async throws {
        let config = BYOCSourceConfig(type: .youtube, name: name)
        _ = BYOCKeychainStore.storeToken(accessToken, forSourceId: config.id)

        let client = YouTubeAPIClient(accessToken: accessToken)
        let subs = try await client.fetchSubscriptions()
        var allVideos: [YouTubeVideo] = []
        for sub in subs.items.prefix(5) {
            let vids = try await client.fetchChannelVideos(channelId: sub.channelId, maxResults: 10)
            allVideos.append(contentsOf: vids.items)
        }

        let items = YouTubeContentAdapter.adaptAll(videos: allVideos, sourceId: config.id)
        sources.append(config)
        youtubeItems.append(contentsOf: items)
        BYOCSourceStore.saveSources(sources)
        logger.info("Added YouTube source", context: ["name": name, "items": "\(items.count)"])
        Task { await triggerInitialEnrichment(items: items) }
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

    // MARK: - Enrichment

    /// Enrich a single item on demand if not already cached.
    public func enrichIfNeeded(_ item: BYOCContentItem) async {
        guard let queue = enrichmentQueue else { return }
        await queue.enrichSingle(item)
    }

    /// Get the cached enrichment result for an item.
    public func enrichmentResult(
        for item: BYOCContentItem
    ) -> BYOCEnrichmentResult? {
        enrichmentQueue?.result(for: item)
    }

    private func triggerInitialEnrichment(
        items: [BYOCContentItem]
    ) async {
        guard let queue = enrichmentQueue else { return }
        let initialBatchSize = 20
        let batch = Array(items.prefix(initialBatchSize))
        guard !batch.isEmpty else { return }
        logger.info(
            "Starting initial enrichment",
            context: ["count": "\(batch.count)"]
        )
        await queue.enrichBatch(batch)
    }
}
