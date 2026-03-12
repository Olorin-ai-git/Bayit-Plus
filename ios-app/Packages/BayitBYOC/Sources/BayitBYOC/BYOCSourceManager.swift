import BayitCore
import Foundation

/// Central manager for all BYOC content sources.
/// Observable state holder injected into SwiftUI environment.
@MainActor
@Observable
public final class BYOCSourceManager: @unchecked Sendable {
    let logger = BayitLogger(category: "BYOCSourceManager")
    private var refreshTask: Task<Void, Never>?

    public internal(set) var sources: [BYOCSourceConfig] = []
    public internal(set) var iptvChannels: [BYOCChannel] = []
    public internal(set) var iptvGroups: [BYOCChannelGroup] = []
    public internal(set) var xtreamChannels: [BYOCChannel] = []
    public internal(set) var xtreamVODItems: [BYOCContentItem] = []
    public internal(set) var xtreamSeriesItems: [BYOCContentItem] = []
    public internal(set) var plexItems: [BYOCContentItem] = []
    public internal(set) var youtubeItems: [BYOCContentItem] = []
    public internal(set) var isRefreshing = false
    public internal(set) var lastError: String?
    public internal(set) var sourceErrors: [String: BYOCSourceStatus] = [:]
    public private(set) var enrichmentQueue: BYOCEnrichmentQueue?

    public var hasAnySources: Bool {
        !sources.isEmpty
    }

    public var sourcesNeedingReauth: [BYOCSourceConfig] {
        sources.filter { $0.status == .authExpired }
    }

    public var hasIPTV: Bool {
        sources.contains { $0.type == .iptv }
    }

    public var hasXtream: Bool {
        sources.contains { $0.type == .xtream }
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
            refreshTask = Task { [weak self] in
                await self?.refreshAll()
            }
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
        sources.append(config)
        BYOCSourceStore.saveSources(sources)

        let channels = try await M3UPlaylistFetcher.fetch(
            url: url,
            sourceId: config.id
        )
        iptvChannels.append(contentsOf: channels)
        iptvGroups = M3UParser.groupChannels(iptvChannels)
        updateLastRefreshed(sourceId: config.id)
        logger.info(
            "Added IPTV source",
            context: ["name": name, "channels": "\(channels.count)"]
        )
    }

    // MARK: - Xtream Codes

    public func addXtreamSource(
        name: String,
        serverURL: String,
        username: String,
        password: String
    ) async throws {
        let client = XtreamCodesClient(
            serverURL: serverURL,
            username: username,
            password: password
        )
        let account = try await client.authenticate()

        let config = BYOCSourceConfig(
            type: .xtream,
            name: name,
            url: URL(string: serverURL),
            accountExpiry: account.expirationDate
        )
        let credential = "\(serverURL)|\(username)|\(password)"
        _ = BYOCKeychainStore.storeToken(credential, forSourceId: config.id)

        sources.append(config)
        BYOCSourceStore.saveSources(sources)

        async let liveCategories = client.fetchLiveCategories()
        async let liveStreams = client.fetchLiveStreams()
        async let vodCategories = client.fetchVODCategories()
        async let vodStreams = client.fetchVODStreams()
        async let seriesList = client.fetchSeries()

        let channels = try await XtreamContentAdapter.adaptAllLiveStreams(
            streams: await liveStreams,
            categories: await liveCategories,
            client: client,
            sourceId: config.id
        )
        let vodItems = try await XtreamContentAdapter.adaptAllVOD(
            items: await vodStreams,
            categories: await vodCategories,
            client: client,
            sourceId: config.id
        )
        let seriesItems = try XtreamContentAdapter.adaptAllSeries(
            series: await seriesList,
            sourceId: config.id
        )

        xtreamChannels.append(contentsOf: channels)
        xtreamVODItems.append(contentsOf: vodItems)
        xtreamSeriesItems.append(contentsOf: seriesItems)
        iptvGroups = M3UParser.groupChannels(iptvChannels + xtreamChannels)
        updateLastRefreshed(sourceId: config.id)
        logger.info(
            "Added Xtream source",
            context: [
                "name": name,
                "channels": "\(channels.count)",
                "vod": "\(vodItems.count)",
                "series": "\(seriesItems.count)",
            ]
        )
        Task { await triggerInitialEnrichment(items: vodItems + seriesItems) }
    }

    // MARK: - Plex

    public func addPlexSource(
        name: String,
        server: PlexServer,
        authToken: String
    ) async throws {
        let client = PlexAPIClient(
            authToken: authToken,
            clientId: plexClientId
        )

        let resolvedURL = try await client.resolveBaseURL(server: server)

        let config = BYOCSourceConfig(
            type: .plex,
            name: name,
            url: URL(string: resolvedURL)
        )
        _ = BYOCKeychainStore.storeToken(authToken, forSourceId: config.id)

        sources.append(config)
        BYOCSourceStore.saveSources(sources)

        let libraries = try await client.fetchLibraries(baseURL: resolvedURL)

        var allItems: [BYOCContentItem] = []
        for lib in libraries {
            let mediaItems = try await client.fetchLibraryItems(
                baseURL: resolvedURL,
                libraryId: lib.id
            )
            let converted = PlexContentAdapter.adaptAll(
                items: mediaItems,
                baseURL: resolvedURL,
                sourceId: config.id,
                authToken: authToken
            )
            allItems.append(contentsOf: converted)
        }

        plexItems.append(contentsOf: allItems)
        updateLastRefreshed(sourceId: config.id)
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
        refreshToken: String?
    ) async throws {
        let config = BYOCSourceConfig(type: .youtube, name: name)
        _ = BYOCKeychainStore.storeToken(accessToken, forSourceId: config.id)
        if let refreshToken {
            _ = BYOCKeychainStore.storeRefreshToken(
                refreshToken, forSourceId: config.id
            )
        }

        sources.append(config)
        BYOCSourceStore.saveSources(sources)
        logger.info(
            "YouTube source saved, fetching content",
            context: ["name": name]
        )

        let client = YouTubeAPIClient(accessToken: accessToken)
        let allVideos = try await fetchYouTubeVideos(client: client)

        let items = YouTubeContentAdapter.adaptAll(
            videos: allVideos, sourceId: config.id
        )
        youtubeItems.append(contentsOf: items)
        updateLastRefreshed(sourceId: config.id)
        logger.info(
            "Added YouTube source",
            context: ["name": name, "items": "\(items.count)"]
        )
        Task { await triggerInitialEnrichment(items: items) }
    }

    // MARK: - Re-authentication

    public func reauthenticatePlexSource(
        sourceId: String,
        server: PlexServer,
        authToken: String
    ) async throws {
        let client = PlexAPIClient(
            authToken: authToken,
            clientId: plexClientId
        )
        let resolvedURL = try await client.resolveBaseURL(server: server)

        _ = BYOCKeychainStore.storeToken(authToken, forSourceId: sourceId)

        if let index = sources.firstIndex(where: { $0.id == sourceId }) {
            sources[index] = BYOCSourceConfig(
                id: sources[index].id,
                type: sources[index].type,
                name: sources[index].name,
                url: URL(string: resolvedURL),
                addedAt: sources[index].addedAt,
                lastRefreshedAt: nil,
                accountExpiry: sources[index].accountExpiry,
                status: .active
            )
            sourceErrors.removeValue(forKey: sourceId)
            BYOCSourceStore.saveSources(sources)
        }

        if let updatedSource = sources.first(where: { $0.id == sourceId }) {
            await refreshPlexSource(updatedSource)
        }
        logger.info(
            "Re-authenticated Plex source",
            context: ["sourceId": sourceId]
        )
    }

    public func reauthenticateYouTubeSource(
        sourceId: String,
        accessToken: String,
        refreshToken: String?
    ) async throws {
        _ = BYOCKeychainStore.storeToken(accessToken, forSourceId: sourceId)
        if let refreshToken {
            _ = BYOCKeychainStore.storeRefreshToken(
                refreshToken, forSourceId: sourceId
            )
        }
        markSourceActive(sourceId: sourceId)
        if let source = sources.first(where: { $0.id == sourceId }) {
            await refreshYouTubeSource(source)
        }
        logger.info(
            "Re-authenticated YouTube source",
            context: ["sourceId": sourceId]
        )
    }

    // MARK: - Source Removal

    public func removeSource(id: String) {
        let sourceType = sources.first { $0.id == id }?.type
        sources.removeAll { $0.id == id }

        switch sourceType {
        case .iptv:
            iptvChannels.removeAll { $0.sourceId == id }
            iptvGroups = M3UParser.groupChannels(iptvChannels + xtreamChannels)
        case .xtream:
            xtreamChannels.removeAll { $0.sourceId == id }
            xtreamVODItems.removeAll { $0.sourceId == id }
            xtreamSeriesItems.removeAll { $0.sourceId == id }
            iptvGroups = M3UParser.groupChannels(iptvChannels + xtreamChannels)
            BYOCKeychainStore.deleteToken(forSourceId: id)
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

    // MARK: - YouTube Content Discovery

    /// Fetch YouTube videos using subscriptions first, then playlists
    /// as fallback, then search as last resort.
    func fetchYouTubeVideos(
        client: YouTubeAPIClient
    ) async throws -> [YouTubeVideo] {
        var allVideos: [YouTubeVideo] = []

        do {
            let subs = try await client.fetchSubscriptions()
            for sub in subs.items.prefix(5) {
                do {
                    let vids = try await client.fetchChannelVideos(
                        channelId: sub.channelId, maxResults: 10
                    )
                    allVideos.append(contentsOf: vids.items)
                } catch {
                    logger.warning(
                        "Failed to fetch channel videos",
                        context: ["channelId": sub.channelId]
                    )
                }
            }
        } catch {
            logger.warning(
                "Subscriptions unavailable, trying playlists",
                context: ["error": "\(error)"]
            )
        }

        if allVideos.isEmpty {
            do {
                logger.info("Trying playlists fallback")
                let playlists = try await client.fetchPlaylists(
                    maxResults: 10
                )
                for playlist in playlists.items.prefix(5) {
                    do {
                        let vids = try await client.fetchPlaylistItems(
                            playlistId: playlist.id, maxResults: 10
                        )
                        allVideos.append(contentsOf: vids.items)
                    } catch {
                        logger.warning(
                            "Failed to fetch playlist items",
                            context: ["playlistId": playlist.id]
                        )
                    }
                }
            } catch {
                logger.warning(
                    "Playlists unavailable, trying search",
                    context: ["error": "\(error)"]
                )
            }
        }

        if allVideos.isEmpty {
            logger.info("Trying search fallback")
            let results = try await client.search(
                query: "trending", maxResults: 25
            )
            allVideos.append(contentsOf: results.items)
        }

        logger.info(
            "YouTube video discovery complete",
            context: ["count": "\(allVideos.count)"]
        )
        return allVideos
    }
}
