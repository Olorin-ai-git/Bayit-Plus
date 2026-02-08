import Foundation

// MARK: - Family Controls

/// Family controls preferences with age limits and allowed hours.
struct FamilyControlsPreferences: Decodable, Sendable {
    let kidsMaxAge: Int?
    let youngstersMaxAge: Int?
    let maxRating: String?
    let allowedHoursStart: String?
    let allowedHoursEnd: String?
    let pinHash: String?
}

/// Request body for updating family controls preferences.
struct FamilyControlsPreferencesUpdate: Encodable, Sendable {
    let kidsMaxAge: Int?
    let youngstersMaxAge: Int?
    let maxRating: String?
    let allowedHoursStart: String?
    let allowedHoursEnd: String?
}

/// Request body for POST /api/v1/family/pin
struct FamilyPinRequest: Encodable, Sendable {
    let pin: String
}

/// Response from POST /api/v1/family/pin/verify
struct FamilyPinVerifyResponse: Decodable, Sendable {
    let valid: Bool?
}

/// Content rating classification levels.
enum ContentRating: String, CaseIterable, Codable, Sendable {
    case g = "G"
    case pg = "PG"
    case pg13 = "PG-13"
    case r = "R"
    case nc17 = "NC-17"
}
