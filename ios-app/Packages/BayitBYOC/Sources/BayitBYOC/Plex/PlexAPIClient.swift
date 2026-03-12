import BayitCore
import Foundation

/// Client for Plex Media Server API operations.
public actor PlexAPIClient {
    private let logger = BayitLogger(category: "PlexAPIClient")
    private let session: URLSession
    private let clientId: String
    public let authToken: String

    private static let resourcesURL = "https://plex.tv/api/v2/resources"

    public init(
        authToken: String,
        clientId: String,
        session: URLSession = .shared
    ) {
        self.authToken = authToken
        self.clientId = clientId
        self.session = session
    }

    /// Discover all servers available to the authenticated user.
    public func discoverServers() async throws -> [PlexServer] {
        var components = URLComponents(string: Self.resourcesURL)!
        components.queryItems = [
            URLQueryItem(name: "includeHttps", value: "1"),
            URLQueryItem(name: "includeRelay", value: "1"),
        ]

        let data = try await authenticatedGet(url: components.url!)

        let resources = try JSONSerialization.jsonObject(
            with: data
        ) as? [[String: Any]] ?? []

        let servers = resources.compactMap { resource -> PlexServer? in
            guard resource["provides"] as? String == "server",
                  let id = resource["clientIdentifier"] as? String,
                  let name = resource["name"] as? String
            else { return nil }

            let rawConns = resource["connections"] as? [[String: Any]] ?? []
            let connections = orderedConnections(rawConns)
            guard !connections.isEmpty else { return nil }

            return PlexServer(
                id: id,
                name: name,
                isOwned: resource["owned"] as? Bool ?? false,
                connections: connections
            )
        }

        logger.info(
            "Discovered Plex servers",
            context: ["count": "\(servers.count)"]
        )
        return servers
    }

    /// Race all connections concurrently with a short timeout each.
    /// Returns the first working base URL or throws if none respond.
    public func resolveBaseURL(
        server: PlexServer
    ) async throws -> String {
        guard !server.connections.isEmpty else {
            throw PlexAPIError.networkError
        }

        return try await withThrowingTaskGroup(
            of: String?.self
        ) { group in
            for conn in server.connections {
                group.addTask {
                    let testURL = URL(
                        string: "\(conn.baseURL)/identity"
                    )!
                    do {
                        _ = try await self.timedGet(
                            url: testURL,
                            timeoutSeconds: conn.isLocal ? 3 : 8
                        )
                        return conn.baseURL
                    } catch {
                        self.logger.info(
                            "Plex connection failed",
                            context: [
                                "url": conn.baseURL,
                                "error": "\(error)",
                            ]
                        )
                        return nil
                    }
                }
            }

            for try await result in group {
                guard let baseURL = result else { continue }
                self.logger.info(
                    "Plex connection resolved",
                    context: [
                        "server": server.name,
                        "url": baseURL,
                    ]
                )
                group.cancelAll()
                return baseURL
            }
            throw PlexAPIError.networkError
        }
    }

    /// GET with a per-request timeout so unreachable hosts fail fast.
    private func timedGet(
        url: URL,
        timeoutSeconds: TimeInterval
    ) async throws -> Data {
        var request = URLRequest(url: url)
        request.setValue(
            "application/json",
            forHTTPHeaderField: "Accept"
        )
        request.timeoutInterval = timeoutSeconds
        addHeaders(&request)

        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return data
    }

    /// Perform an authenticated GET request.
    public func authenticatedGet(url: URL) async throws -> Data {
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        addHeaders(&request)

        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return data
    }

    private func addHeaders(_ request: inout URLRequest) {
        request.setValue(
            authToken,
            forHTTPHeaderField: "X-Plex-Token"
        )
        request.setValue(
            clientId,
            forHTTPHeaderField: "X-Plex-Client-Identifier"
        )
    }

    private func validateResponse(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw PlexAPIError.networkError
        }
        guard (200 ... 299).contains(http.statusCode) else {
            throw PlexAPIError.httpError(statusCode: http.statusCode)
        }
    }

    /// Parse and order connections: local first (same LAN), then
    /// remote with URI (*.plex.direct TLS), then remote by IP.
    private func orderedConnections(
        _ connections: [[String: Any]]
    ) -> [PlexConnection] {
        connections.compactMap { conn in
            guard let host = conn["address"] as? String,
                  let port = conn["port"] as? Int
            else { return nil }
            return PlexConnection(
                host: host,
                port: port,
                uri: conn["uri"] as? String,
                isLocal: conn["local"] as? Bool ?? false,
                isRelay: conn["relay"] as? Bool ?? false
            )
        }
    }
}

public enum PlexAPIError: Error, Sendable {
    case networkError
    case httpError(statusCode: Int)
    case invalidResponse
}
