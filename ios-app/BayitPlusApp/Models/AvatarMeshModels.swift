import Foundation

/// APIClient uses .convertFromSnakeCase key decoding, so explicit
/// snake_case CodingKeys are unnecessary and would conflict.

struct AvatarMeshStatus: Codable, Identifiable {
    let id: String
    let avatarId: String
    let userId: String
    let status: String
    let glbGcsPath: String?
    let thumbnailGcsPath: String?
    let blendShapes: [MeshBlendShapeInfo]
    let boneCount: Int?
    let vertexCount: Int?
    let creditsCharged: Int
    let errorMessage: String?
    let createdAt: String
    let updatedAt: String
}

struct MeshBlendShapeInfo: Codable {
    let name: String
    let defaultWeight: Double
}

struct MeshGlbUrl: Codable {
    let avatarId: String
    let signedUrl: String
    let expiresInSeconds: Int
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
    let greetingAudioGcsPath: String?
    let lipsyncDataGcsPath: String?
    let vocabularyOfTheDay: String?
    let generatedAt: String
    let expiresAt: String?
}
