import Foundation

// MARK: - Household Management

/// A household with members and profile limits.
struct Household: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let ownerId: String?
    let members: [HouseholdMember]?
    let maxProfiles: Int?
}

/// A member within a household.
struct HouseholdMember: Decodable, Sendable, Identifiable {
    let id: String?
    let userId: String?
    let displayName: String?
    let role: String?
    let avatar: String?
    let joinedAt: String?

    var stableId: String { id ?? userId ?? UUID().uuidString }
}

/// Request body for POST /api/v1/household/members
struct HouseholdAddMemberRequest: Encodable, Sendable {
    let userId: String
}
