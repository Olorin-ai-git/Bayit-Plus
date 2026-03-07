import BayitCore
import Foundation

extension BYOCSourceManager {
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
        case .plex:
            await refreshPlexSource(source)
        case .youtube:
            break
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
            iptvGroups = M3UParser.groupChannels(iptvChannels)
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
            guard let server = servers.first(where: {
                $0.baseURL == urlStr
            }) ?? servers.first else { return }

            plexItems.removeAll { $0.sourceId == source.id }
            let libraries = try await client.fetchLibraries(server: server)

            var allItems: [BYOCContentItem] = []
            for lib in libraries {
                let items = try await client.fetchLibraryItems(
                    server: server,
                    libraryId: lib.id
                )
                allItems.append(contentsOf: PlexContentAdapter.adaptAll(
                    items: items,
                    server: server,
                    sourceId: source.id,
                    authToken: token
                ))
            }
            plexItems.append(contentsOf: allItems)
            updateLastRefreshed(sourceId: source.id)
        } catch {
            lastError = error.localizedDescription
            logger.error(
                "Failed to refresh Plex source",
                error: error,
                context: ["sourceId": source.id]
            )
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
            lastRefreshedAt: Date()
        )
        BYOCSourceStore.saveSources(sources)
    }
}
