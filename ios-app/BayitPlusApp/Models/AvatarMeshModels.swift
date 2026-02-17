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

// MARK: - VOD Interactive Moments

struct InteractiveMoment: Codable, Identifiable {
    let timestamp: Double
    let duration: Double
    let sceneContext: String
    let characterName: String
    let characterFrameUrl: String?
    let interactionPrompt: String
    let voiceId: String
    let dialogueOptions: [String]
    let lipsyncVideoUrl: String?

    var id: Double { timestamp }
}

struct VODSessionResponse: Codable {
    let id: String
    let characterName: String
    let status: String
}

struct CharacterResponsePayload: Codable {
    let characterName: String
    let responseText: String
    let audioUrl: String
    let animatedVideoUrl: String
}

struct SessionStatusPayload: Codable {
    let sessionId: String
    let characterName: String
    let status: String
    let exchangesCount: Int
}

// MARK: - Magic Mirror

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
