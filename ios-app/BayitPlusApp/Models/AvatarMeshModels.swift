import Foundation

/// APIClient uses .convertFromSnakeCase key decoding, so explicit
/// snake_case CodingKeys are unnecessary and would conflict.

struct CreatifyAvatarStatus: Codable, Identifiable {
    let avatarId: String
    let userId: String
    let creatifyPersonaId: String?
    let status: String
    let avatarImageUrl: String?
    let errorMessage: String?
    let createdAt: String
    let updatedAt: String

    var id: String { avatarId }
}

enum BiometricConsentType: String, CaseIterable {
    case meshGeneration = "mesh_generation"
    case voiceV2V = "voice_v2v"
    case latentFeatures = "latent_features"
}

struct BiometricConsentStatus: Codable {
    let profileId: String
    let consents: [ConsentEntry]
}

struct ConsentEntry: Codable, Identifiable {
    var id: String { consentType }
    let consentType: String
    let active: Bool
}

struct MagicMirrorGreeting: Codable {
    let id: String
    let userId: String
    let profileId: String
    let greetingTextHe: String
    let greetingTextEn: String
    let greetingAudioUrl: String?
    let lipsyncVideoUrl: String?
    let vocabularyOfTheDay: String?
    let generatedAt: String
    let expiresAt: String?
}
