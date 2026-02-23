import Foundation

// APIClient uses .convertFromSnakeCase key decoding, so explicit
// snake_case CodingKeys are unnecessary and would conflict.

struct CreatifyAvatarStatus: Codable, Identifiable {
    let avatarId: String
    let userId: String
    let creatifyPersonaId: String?
    let status: String
    let avatarImageUrl: String?
    let errorMessage: String?
    let hasVoiceClone: Bool
    let createdAt: String
    let updatedAt: String

    var id: String {
        avatarId
    }
}

enum BiometricConsentType: String, CaseIterable {
    case meshGeneration = "mesh_generation"
    case voiceV2V = "voice_v2v"
    case latentFeatures = "latent_features"
    case voiceInteraction = "voice_interaction"
}

struct BiometricConsentStatus: Codable {
    let profileId: String
    let consents: [ConsentEntry]
}

struct ConsentEntry: Codable, Identifiable {
    var id: String {
        consentType
    }

    let consentType: String
    let active: Bool
}

// MARK: - VOD Interactive Moments

struct AvatarPlacement: Codable {
    let position: String
    let offsetX: Double?
    let offsetY: Double?
    let confidence: Double?
    let fallbackPosition: String?
}

struct CharacterProfile: Codable, Identifiable {
    let name: String
    let voiceId: String
    let frameUrl: String
    let personalityTraits: [String]?
    let relationshipToOthers: String?

    var id: String {
        name
    }
}

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
    let characterResponseText: String?
    let characterResponseVideoUrl: String?
    let avatarPlacement: AvatarPlacement?
    let characters: [CharacterProfile]?
    let allowCrossCharacterReactions: Bool?
    let maxActiveCharacters: Int?

    var id: Double {
        timestamp
    }
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

// MARK: - Audio Transcription

struct TranscriptionResponse: Codable, Sendable {
    let transcript: String
}

// MARK: - Free-Form Dialogue

struct ContentCharacter: Codable, Identifiable {
    let name: String
    let voiceId: String
    let frameUrl: String
    let description: String
    let movieContext: String

    var id: String {
        name
    }
}

struct DialogueExchange: Codable, Identifiable {
    let speaker: String
    let messageText: String
    let audioUrl: String?
    let animatedVideoUrl: String?
    let characterName: String?
    let addressedTo: String?
    let reactionTo: String?
    let participantUserId: String?
    let participantName: String?

    var id: String {
        "\(speaker)-\(messageText.prefix(20))"
    }
}

// MARK: - Multi-Character Interaction

struct MultiCharacterExchange: Codable {
    let speaker: String
    let messageText: String
    let characterName: String?
    let audioUrl: String?
    let animatedVideoUrl: String?
    let reactionTo: String?
}

struct MultiCharacterResponse: Codable {
    let exchanges: [MultiCharacterExchange]
}

// MARK: - Shared Interactive Sessions

struct SharedParticipant: Codable, Identifiable {
    let userId: String
    let profileId: String
    let avatarId: String
    let avatarImageUrl: String?
    let displayName: String

    var id: String {
        userId
    }
}

struct SharedSessionState: Codable {
    let sessionId: String
    let partyId: String
    let characterName: String
    let participants: [SharedParticipant]
    let currentTurnUserId: String?
    let turnsCompleted: Int
    let maxTurnsPerParticipant: Int
    let isActive: Bool
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
