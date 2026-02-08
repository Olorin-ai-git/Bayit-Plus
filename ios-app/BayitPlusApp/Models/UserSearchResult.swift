import Foundation

/// A user result from the friend search endpoint.
/// Maps to the backend `/api/v1/friends/search` response items.
struct UserSearchResult: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let avatar: String?
    let isFriend: Bool
    let hasPendingRequest: Bool

    enum CodingKeys: String, CodingKey {
        case id = "user_id"
        case name
        case avatar
        case isFriend = "is_friend"
        case hasPendingRequest = "has_pending_request"
    }
}
