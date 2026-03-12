import BayitCore
import Foundation

extension BYOCSourceManager {
    /// Tracks in-flight token refresh requests to prevent races.
    private static var refreshInProgress: Set<String> = []

    // MARK: - Refresh

    public func refreshAll() async {
        isRefreshing = true
        lastError = nil

        for source in sources {
            await refreshSource(source)
        }
        isRefreshing = false
    }

    public func refreshIPTV() async {
        for source in sources where source.type == .iptv {
            await refreshSource(source)
        }
    }

    func refreshSource(_ source: BYOCSourceConfig) async {
        switch source.type {
        case .iptv:
            await refreshIPTVSource(source)
        case .xtream:
            await refreshXtreamSource(source)
        case .plex:
            await refreshPlexSource(source)
        case .youtube:
            await refreshYouTubeSource(source)
        }
    }

    func refreshIPTVSource(_ source: BYOCSourceConfig) async {
        guard let url = source.url else { return }
        do {
            iptvChannels.removeAll { $0.sourceId == source.id }
            let channels = try await M3UPlaylistFetcher.fetch(
                url: url,
                sourceId: source.id
            )
            iptvChannels.append(contentsOf: channels)
            iptvGroups = M3UParser.groupChannels(iptvChannels + xtreamChannels)
            updateLastRefreshed(sourceId: source.id)
        } catch {
            lastError = error.localizedDescription
            logger.error(
                "Failed to refresh IPTV source",
                error: error,
                context: ["sourceId": source.id]
            )
        }
    }

    func refreshXtreamSource(_ source: BYOCSourceConfig) async {
        guard let credential = BYOCKeychainStore.retrieveToken(
            forSourceId: source.id
        ) else {
            sourceErrors[source.id] = .error
            lastError = "Missing Xtream credentials"
            logger.warning(
                "Missing Xtream credential in keychain",
                context: ["sourceId": source.id]
            )
            return
        }
        let parts = credential.split(separator: "|", maxSplits: 2)
        guard parts.count == 3 else {
            sourceErrors[source.id] = .error
            lastError = "Malformed Xtream credentials"
            logger.warning(
                "Malformed Xtream credential format",
                context: ["sourceId": source.id]
            )
            return
        }
        let serverURL = String(parts[0])
        let username = String(parts[1])
        let password = String(parts[2])
        do {
            let client = XtreamCodesClient(
                serverURL: serverURL,
                username: username,
                password: password
            )
            _ = try await client.authenticate()

            xtreamChannels.removeAll { $0.sourceId == source.id }
            xtreamVODItems.removeAll { $0.sourceId == source.id }
            xtreamSeriesItems.removeAll { $0.sourceId == source.id }

            async let liveCats = client.fetchLiveCategories()
            async let liveStreams = client.fetchLiveStreams()
            async let vodCats = client.fetchVODCategories()
            async let vodStreams = client.fetchVODStreams()
            async let seriesList = client.fetchSeries()

            let channels = try await XtreamContentAdapter.adaptAllLiveStreams(
                streams: await liveStreams,
                categories: await liveCats,
                client: client,
                sourceId: source.id
            )
            let vodItems = try await XtreamContentAdapter.adaptAllVOD(
                items: await vodStreams,
                categories: await vodCats,
                client: client,
                sourceId: source.id
            )
            let seriesItems = try XtreamContentAdapter.adaptAllSeries(
                series: await seriesList,
                sourceId: source.id
            )

            xtreamChannels.append(contentsOf: channels)
            xtreamVODItems.append(contentsOf: vodItems)
            xtreamSeriesItems.append(contentsOf: seriesItems)
            iptvGroups = M3UParser.groupChannels(iptvChannels + xtreamChannels)
            updateLastRefreshed(sourceId: source.id)
        } catch {
            lastError = error.localizedDescription
            logger.error(
                "Failed to refresh Xtream source",
                error: error,
                context: ["sourceId": source.id]
            )
        }
    }

    func refreshPlexSource(_ source: BYOCSourceConfig) async {
        guard let urlStr = source.url?.absoluteString,
              let token = BYOCKeychainStore.retrieveToken(forSourceId: source.id)
        else { return }
        do {
            let client = PlexAPIClient(
                authToken: token,
                clientId: plexClientId
            )
            let servers = try await client.discoverServers()
            let matchedServer = servers.first { $0.baseURL == urlStr }
            if matchedServer == nil, let fallback = servers.first {
                logger.warning(
                    "Plex server changed, falling back to first available",
                    context: [
                        "sourceId": source.id,
                        "expected": urlStr,
                        "fallback": fallback.baseURL,
                    ]
                )
            }
            guard let server = matchedServer ?? servers.first else { return }

            let resolvedURL = try await client.resolveBaseURL(server: server)

            plexItems.removeAll { $0.sourceId == source.id }
            let libraries = try await client.fetchLibraries(baseURL: resolvedURL)

            var allItems: [BYOCContentItem] = []
            for lib in libraries {
                let items = try await client.fetchLibraryItems(
                    baseURL: resolvedURL,
                    libraryId: lib.id
                )
                allItems.append(contentsOf: PlexContentAdapter.adaptAll(
                    items: items,
                    baseURL: resolvedURL,
                    sourceId: source.id,
                    authToken: token
                ))
            }
            plexItems.append(contentsOf: allItems)
            markSourceActive(sourceId: source.id)
            updateLastRefreshed(sourceId: source.id)
        } catch let error as PlexAPIError {
            handlePlexError(error, source: source)
        } catch {
            lastError = error.localizedDescription
            sourceErrors[source.id] = .error
            logger.error(
                "Failed to refresh Plex source",
                error: error,
                context: ["sourceId": source.id]
            )
        }
    }

    private func handlePlexError(
        _ error: PlexAPIError,
        source: BYOCSourceConfig
    ) {
        switch error {
        case let .httpError(statusCode) where statusCode == 401:
            markSourceAuthExpired(sourceId: source.id)
            logger.warning(
                "Plex token expired",
                context: ["sourceId": source.id]
            )
        default:
            lastError = "\(error)"
            sourceErrors[source.id] = .error
            logger.error(
                "Plex API error",
                context: [
                    "sourceId": source.id,
                    "error": "\(error)",
                ]
            )
        }
    }

    private func markSourceAuthExpired(sourceId: String) {
        sourceErrors[sourceId] = .authExpired
        guard let index = sources.firstIndex(where: { $0.id == sourceId })
        else { return }
        sources[index] = BYOCSourceConfig(
            id: sources[index].id,
            type: sources[index].type,
            name: sources[index].name,
            url: sources[index].url,
            addedAt: sources[index].addedAt,
            lastRefreshedAt: sources[index].lastRefreshedAt,
            accountExpiry: sources[index].accountExpiry,
            status: .authExpired
        )
        BYOCSourceStore.saveSources(sources)
    }

    func markSourceActive(sourceId: String) {
        sourceErrors.removeValue(forKey: sourceId)
        guard let index = sources.firstIndex(where: { $0.id == sourceId }),
              sources[index].status != .active
        else { return }
        sources[index] = BYOCSourceConfig(
            id: sources[index].id,
            type: sources[index].type,
            name: sources[index].name,
            url: sources[index].url,
            addedAt: sources[index].addedAt,
            lastRefreshedAt: sources[index].lastRefreshedAt,
            accountExpiry: sources[index].accountExpiry,
            status: .active
        )
        BYOCSourceStore.saveSources(sources)
    }

    func refreshYouTubeSource(_ source: BYOCSourceConfig) async {
        guard let token = BYOCKeychainStore.retrieveToken(
            forSourceId: source.id
        ) else { return }
        do {
            try await fetchYouTubeContent(
                source: source, accessToken: token
            )
            markSourceActive(sourceId: source.id)
        } catch let error as YouTubeError {
            await handleYouTubeError(error, source: source)
        } catch {
            lastError = error.localizedDescription
            sourceErrors[source.id] = .error
            logger.error(
                "Failed to refresh YouTube source",
                error: error,
                context: ["sourceId": source.id]
            )
        }
    }

    private func fetchYouTubeContent(
        source: BYOCSourceConfig,
        accessToken: String
    ) async throws {
        let client = YouTubeAPIClient(accessToken: accessToken)
        let allVideos = try await fetchYouTubeVideos(
            client: client
        )
        youtubeItems.removeAll { $0.sourceId == source.id }
        let items = YouTubeContentAdapter.adaptAll(
            videos: allVideos,
            sourceId: source.id
        )
        youtubeItems.append(contentsOf: items)
        updateLastRefreshed(sourceId: source.id)
    }

    private func handleYouTubeError(
        _ error: YouTubeError,
        source: BYOCSourceConfig
    ) async {
        switch error {
        case .httpError(statusCode: 401), .httpError(statusCode: 403):
            if let refreshed = await tryYouTubeTokenRefresh(
                source: source
            ) {
                do {
                    try await fetchYouTubeContent(
                        source: source, accessToken: refreshed
                    )
                    markSourceActive(sourceId: source.id)
                    return
                } catch {
                    logger.warning(
                        "YouTube retry after refresh failed",
                        context: ["sourceId": source.id]
                    )
                }
            }
            markSourceAuthExpired(sourceId: source.id)
            logger.warning(
                "YouTube token expired or revoked",
                context: ["sourceId": source.id]
            )
        case .quotaExceeded:
            sourceErrors[source.id] = .error
            lastError = "YouTube API quota exceeded. Try again later"
            logger.warning(
                "YouTube API quota exceeded, skipping refresh",
                context: ["sourceId": source.id]
            )
        default:
            lastError = "\(error)"
            sourceErrors[source.id] = .error
            logger.error(
                "YouTube API error",
                context: [
                    "sourceId": source.id,
                    "error": "\(error)",
                ]
            )
        }
    }

    private func tryYouTubeTokenRefresh(
        source: BYOCSourceConfig
    ) async -> String? {
        guard !Self.refreshInProgress.contains(source.id) else {
            logger.info(
                "YouTube refresh already in progress, skipping",
                context: ["sourceId": source.id]
            )
            return BYOCKeychainStore.retrieveToken(forSourceId: source.id)
        }
        Self.refreshInProgress.insert(source.id)
        defer { Self.refreshInProgress.remove(source.id) }

        guard let refreshToken = BYOCKeychainStore.retrieveRefreshToken(
            forSourceId: source.id
        ) else { return nil }

        let clientId = Bundle.main.infoDictionary?[
            "YOUTUBE_CLIENT_ID"
        ] as? String ?? ""
        let clientSecret = Bundle.main.infoDictionary?[
            "YOUTUBE_CLIENT_SECRET"
        ] as? String ?? ""
        guard !clientId.isEmpty, !clientSecret.isEmpty else { return nil }

        let authService = YouTubeAuthService(
            clientId: clientId,
            clientSecret: clientSecret
        )
        do {
            let tokens = try await authService.refreshAccessToken(
                refreshToken: refreshToken
            )
            _ = BYOCKeychainStore.storeToken(
                tokens.accessToken, forSourceId: source.id
            )
            if let newRefresh = tokens.refreshToken {
                _ = BYOCKeychainStore.storeRefreshToken(
                    newRefresh, forSourceId: source.id
                )
            }
            logger.info(
                "YouTube token refreshed",
                context: ["sourceId": source.id]
            )
            return tokens.accessToken
        } catch {
            logger.warning(
                "YouTube token refresh failed",
                context: ["sourceId": source.id]
            )
            return nil
        }
    }

    func updateLastRefreshed(sourceId: String) {
        guard let index = sources.firstIndex(where: { $0.id == sourceId }) else {
            return
        }
        sources[index] = BYOCSourceConfig(
            id: sources[index].id,
            type: sources[index].type,
            name: sources[index].name,
            url: sources[index].url,
            addedAt: sources[index].addedAt,
            lastRefreshedAt: Date(),
            accountExpiry: sources[index].accountExpiry,
            status: sources[index].status
        )
        BYOCSourceStore.saveSources(sources)
    }
}
