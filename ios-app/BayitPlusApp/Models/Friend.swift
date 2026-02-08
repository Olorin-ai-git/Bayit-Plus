import Foundation

/// A friend in the user's friend list.
/// Maps to the backend `get_friends` response shape from `friendship_search_service.py`.
struct Friend: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let avatar: String?
    let friendshipId: String
    let friendsSince: Date?
    let lastGameAt: Date?

    enum CodingKeys: String, CodingKey {
        case id = "user_id"
        case name
        case avatar
        case friendshipId = "friendship_id"
        case friendsSince = "friends_since"
        case lastGameAt = "last_game_at"
    }
}
