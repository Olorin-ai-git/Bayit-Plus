import BayitNetworking
import Foundation

/// Repository protocol for watch party REST and WebSocket operations.
protocol WatchPartyRepository: Sendable {
    func createParty(_ request: CreatePartyRequest) async throws -> WatchParty
    func fetchMyParties() async throws -> [WatchParty]
    func joinParty(roomCode: String) async throws -> WatchParty
    func fetchParty(partyId: String) async throws -> WatchParty
    func leaveParty(partyId: String) async throws
    func endParty(partyId: String) async throws
    func sendChat(_ request: PartyChatRequest) async throws
    func syncPlayback(_ request: PlaybackSyncRequest) async throws
    func connectWebSocket(partyId: String, manager: WebSocketManager, authToken: String) async throws -> WebSocketConnection
}

/// Production implementation of `WatchPartyRepository` using `APIClient`.
final class APIWatchPartyRepository: WatchPartyRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func createParty(_ request: CreatePartyRequest) async throws -> WatchParty {
        return try await client.post(
            "/api/v1/party/create",
            body: request,
            as: WatchParty.self
        )
    }

    func fetchMyParties() async throws -> [WatchParty] {
        return try await client.get("/api/v1/party/my-parties", as: [WatchParty].self)
    }

    func joinParty(roomCode: String) async throws -> WatchParty {
        return try await client.post(
            "/api/v1/party/join/\(roomCode)",
            body: EmptyBody(),
            as: WatchParty.self
        )
    }

    func fetchParty(partyId: String) async throws -> WatchParty {
        return try await client.get(
            "/api/v1/party/\(partyId)",
            as: WatchParty.self
        )
    }

    func leaveParty(partyId: String) async throws {
        struct LeaveBody: Encodable, Sendable { let partyId: String
            enum CodingKeys: String, CodingKey { case partyId = "party_id" }
        }
        _ = try await client.post(
            "/api/v1/party/leave",
            body: LeaveBody(partyId: partyId),
            as: MessageResponse.self
        )
    }

    func endParty(partyId: String) async throws {
        struct EndBody: Encodable, Sendable { let partyId: String
            enum CodingKeys: String, CodingKey { case partyId = "party_id" }
        }
        _ = try await client.post(
            "/api/v1/party/end",
            body: EndBody(partyId: partyId),
            as: MessageResponse.self
        )
    }

    func sendChat(_ request: PartyChatRequest) async throws {
        _ = try await client.post(
            "/api/v1/party/chat",
            body: request,
            as: MessageResponse.self
        )
    }

    func syncPlayback(_ request: PlaybackSyncRequest) async throws {
        _ = try await client.post(
            "/api/v1/party/sync",
            body: request,
            as: MessageResponse.self
        )
    }

    func connectWebSocket(
        partyId: String,
        manager: WebSocketManager,
        authToken: String
    ) async throws -> WebSocketConnection {
        let baseURL = await client.configuration.baseURL
        let wsScheme = baseURL.scheme == "https" ? "wss" : "ws"
        let host = baseURL.host ?? "localhost"
        let port = baseURL.port.map { ":\($0)" } ?? ""
        let urlString = "\(wsScheme)://\(host)\(port)/ws/party/\(partyId)"

        guard let url = URL(string: urlString) else {
            throw APIError.networkError(underlying: "Invalid WebSocket URL for party")
        }
        return try await manager.connect(to: url, authToken: authToken)
    }
}
