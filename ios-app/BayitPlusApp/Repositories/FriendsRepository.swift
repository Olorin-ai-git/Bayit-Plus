import BayitNetworking
import Foundation

/// Repository protocol for friends list and friend request API operations.
protocol FriendsRepository: Sendable {
    func fetchFriends() async throws -> [Friend]
    func fetchRequests() async throws -> FriendRequestsResponse
    func sendRequest(receiverId: String) async throws
    func acceptRequest(requestId: String) async throws
    func rejectRequest(requestId: String) async throws
    func cancelRequest(requestId: String) async throws
    func removeFriend(friendId: String) async throws
    func searchUsers(query: String, limit: Int) async throws -> [UserSearchResult]
}

/// Response container for incoming and outgoing friend requests.
struct FriendRequestsResponse: Decodable, Sendable {
    let incoming: [FriendRequest]
    let outgoing: [FriendRequest]
}

/// Production implementation of `FriendsRepository` using `APIClient`.
final class APIFriendsRepository: FriendsRepository, @unchecked Sendable {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchFriends() async throws -> [Friend] {
        struct FriendsListWrapper: Decodable, Sendable { let friends: [Friend] }
        let wrapper = try await client.get("/api/v1/friends/list", as: FriendsListWrapper.self)
        return wrapper.friends
    }

    func fetchRequests() async throws -> FriendRequestsResponse {
        return try await client.get("/api/v1/friends/requests", as: FriendRequestsResponse.self)
    }

    func sendRequest(receiverId: String) async throws {
        struct SendRequest: Encodable, Sendable { let receiverId: String
            enum CodingKeys: String, CodingKey { case receiverId = "receiver_id" }
        }
        _ = try await client.post(
            "/api/v1/friends/request",
            body: SendRequest(receiverId: receiverId),
            as: MessageResponse.self
        )
    }

    func acceptRequest(requestId: String) async throws {
        struct AcceptBody: Encodable, Sendable { let requestId: String
            enum CodingKeys: String, CodingKey { case requestId = "request_id" }
        }
        _ = try await client.post(
            "/api/v1/friends/request/accept",
            body: AcceptBody(requestId: requestId),
            as: MessageResponse.self
        )
    }

    func rejectRequest(requestId: String) async throws {
        struct RejectBody: Encodable, Sendable { let requestId: String
            enum CodingKeys: String, CodingKey { case requestId = "request_id" }
        }
        _ = try await client.post(
            "/api/v1/friends/request/reject",
            body: RejectBody(requestId: requestId),
            as: MessageResponse.self
        )
    }

    func cancelRequest(requestId: String) async throws {
        struct CancelBody: Encodable, Sendable { let requestId: String
            enum CodingKeys: String, CodingKey { case requestId = "request_id" }
        }
        _ = try await client.post(
            "/api/v1/friends/request/cancel",
            body: CancelBody(requestId: requestId),
            as: MessageResponse.self
        )
    }

    func removeFriend(friendId: String) async throws {
        _ = try await client.delete(
            "/api/v1/friends/\(friendId)",
            as: MessageResponse.self
        )
    }

    func searchUsers(query: String, limit: Int) async throws -> [UserSearchResult] {
        struct SearchBody: Encodable, Sendable { let query: String; let limit: Int }
        return try await client.post(
            "/api/v1/friends/search",
            body: SearchBody(query: query, limit: limit),
            as: [UserSearchResult].self
        )
    }
}
