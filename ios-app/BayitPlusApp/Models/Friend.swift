import Foundation

/// A friend in the user's friend list.
/// Maps to the backend `get_friends` response shape from `friendship_search_service.py`.
/// Note: APIClient uses `.convertFromSnakeCase` so explicit CodingKeys for snake_case
/// fields are not needed (and would conflict with the automatic conversion).
struct Friend: Codable, Identifiable, Hashable, Sendable {
    let userId: String
    let name: String
    let avatar: String?
    let friendshipId: String
    let friendsSince: Date?
    let lastGameAt: Date?

    var id: String {
        userId
    }
}
