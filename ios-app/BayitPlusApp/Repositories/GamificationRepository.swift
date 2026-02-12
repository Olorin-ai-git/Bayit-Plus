import BayitNetworking
import Foundation

protocol GamificationRepository: Sendable {

    func fetchProfile(
        profileId: String
    ) async throws -> GamificationProfile

    func claimPerk(
        profileId: String, perkId: String
    ) async throws -> GamificationProfile
}

final class APIGamificationRepository: GamificationRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchProfile(
        profileId: String
    ) async throws -> GamificationProfile {
        return try await client.get(
            "/api/v1/gamification/profile?profile_id=\(profileId)",
            as: GamificationProfile.self
        )
    }

    func claimPerk(
        profileId: String, perkId: String
    ) async throws -> GamificationProfile {
        let body: [String: String] = [
            "profile_id": profileId,
            "perk_id": perkId,
        ]
        return try await client.postJSON(
            "/api/v1/gamification/claim-perk",
            body: body,
            as: GamificationProfile.self
        )
    }
}

struct GamificationProfile: Codable {
    let profileId: String
    let currentLevel: Int
    let levelTitle: String
    let levelTitleHe: String
    let currentXp: Int
    let totalXp: Int
    let xpToNextLevel: Int
    let unlockedPerks: [UnlockedPerk]
    let missionsCompleted: Int
    let mirrorSessions: Int
    let talkBackAttempts: Int
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case profileId = "profile_id"
        case currentLevel = "current_level"
        case levelTitle = "level_title"
        case levelTitleHe = "level_title_he"
        case currentXp = "current_xp"
        case totalXp = "total_xp"
        case xpToNextLevel = "xp_to_next_level"
        case unlockedPerks = "unlocked_perks"
        case missionsCompleted = "missions_completed"
        case mirrorSessions = "mirror_sessions"
        case talkBackAttempts = "talkback_attempts"
        case createdAt = "created_at"
    }
}

struct UnlockedPerk: Codable {
    let perkId: String
    let perkType: String
    let unlockedAt: String
    let claimed: Bool

    enum CodingKeys: String, CodingKey {
        case perkId = "perk_id"
        case perkType = "perk_type"
        case unlockedAt = "unlocked_at"
        case claimed
    }
}
