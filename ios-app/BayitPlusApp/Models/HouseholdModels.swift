import Foundation

// MARK: - Household Management

/// A household with members and profile limits.
/// Backend returns `household_id` which maps to `householdId` via convertFromSnakeCase.
struct Household: Decodable, Sendable, Identifiable {
    let householdId: String
    let name: String?
    let ownerId: String?
    let members: [HouseholdMember]?
    let sharedControlsId: String?
    let maxProfiles: Int?

    var id: String { householdId }
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

