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

            let connections = resource["connections"] as? [[String: Any]] ?? []
            guard let conn = bestConnection(connections) else { return nil }

            return PlexServer(
                id: id,
                name: name,
                host: conn.host,
                port: conn.port,
                isLocal: conn.isLocal,
                isOwned: resource["owned"] as? Bool ?? false
            )
        }

        logger.info(
            "Discovered Plex servers",
            context: ["count": "\(servers.count)"]
        )
        return servers
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

    private func bestConnection(
        _ connections: [[String: Any]]
    ) -> (host: String, port: Int, isLocal: Bool)? {
        let local = connections.first {
            $0["local"] as? Bool == true
        }
        let conn = local ?? connections.first
        guard let host = conn?["address"] as? String,
              let port = conn?["port"] as? Int
        else { return nil }
        return (host, port, conn?["local"] as? Bool ?? false)
    }
}

public enum PlexAPIError: Error, Sendable {
    case networkError
    case httpError(statusCode: Int)
    case invalidResponse
}
