import Foundation

// MARK: - Family Controls

/// Family controls from GET /api/v1/family/controls.
///
/// Maps to the backend `format_response` output. The APIClient
/// auto-converts snake_case keys to camelCase.
struct FamilyControlsPreferences: Decodable, Sendable {
    let userId: String?
    let kidsAgeLimit: Int?
    let youngstersAgeLimit: Int?
    let kidsEnabled: Bool?
    let youngstersEnabled: Bool?
    let maxContentRating: String?
    let viewingHoursEnabled: Bool?
    let viewingStartHour: Int?
    let viewingEndHour: Int?
    let createdAt: String?
    let updatedAt: String?
}

/// Request body for POST /api/v1/family/controls/setup.
struct FamilyControlsSetupRequest: Encodable, Sendable {
    let pin: String
    let kidsAgeLimit: Int
    let youngstersAgeLimit: Int
}

/// Wrapped response for setup/update endpoints.
struct FamilyControlsWrappedResponse: Decodable, Sendable {
    let status: String?
    let message: String?
    let controls: FamilyControlsPreferences?
}

/// Request body for PATCH /api/v1/family/controls.
struct FamilyControlsUpdateRequest: Encodable, Sendable {
    let kidsAgeLimit: Int?
    let youngstersAgeLimit: Int?
    let maxContentRating: String?
    let viewingHoursEnabled: Bool?
    let viewingStartHour: Int?
    let viewingEndHour: Int?
}

/// Request body for POST /api/v1/family/controls/verify-pin.
struct FamilyPinRequest: Encodable, Sendable {
    let pin: String
}

/// Response from POST /api/v1/family/controls/verify-pin.
struct FamilyPinVerifyResponse: Decodable, Sendable {
    let status: String?
    let message: String?
}

/// Content rating classification levels.
enum ContentRating: String, CaseIterable, Codable, Sendable {
    case g = "G"
    case pg = "PG"
    case pg13 = "PG-13"
}
