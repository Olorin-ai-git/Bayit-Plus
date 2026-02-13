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
    let greetingTextHe: String
    let greetingTextEn: String
    let vocabularyWords: [VocabWord]
}

struct VocabWord: Codable {
    let wordHe: String
    let transliteration: String
    let translation: String
}
