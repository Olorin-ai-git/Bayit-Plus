import Foundation

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

    enum CodingKeys: String, CodingKey {
        case id
        case avatarId = "avatar_id"
        case userId = "user_id"
        case status
        case glbGcsPath = "glb_gcs_path"
        case thumbnailGcsPath = "thumbnail_gcs_path"
        case blendShapes = "blend_shapes"
        case boneCount = "bone_count"
        case vertexCount = "vertex_count"
        case creditsCharged = "credits_charged"
        case errorMessage = "error_message"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct MeshBlendShapeInfo: Codable {
    let name: String
    let defaultWeight: Double

    enum CodingKeys: String, CodingKey {
        case name
        case defaultWeight = "default_weight"
    }
}

struct MeshGlbUrl: Codable {
    let avatarId: String
    let signedUrl: String
    let expiresInSeconds: Int

    enum CodingKeys: String, CodingKey {
        case avatarId = "avatar_id"
        case signedUrl = "signed_url"
        case expiresInSeconds = "expires_in_seconds"
    }
}

struct BiometricConsentStatus: Codable {
    let profileId: String
    let consents: [ConsentEntry]

    enum CodingKeys: String, CodingKey {
        case profileId = "profile_id"
        case consents
    }
}

struct ConsentEntry: Codable, Identifiable {
    var id: String { consentType }
    let consentType: String
    let active: Bool

    enum CodingKeys: String, CodingKey {
        case consentType = "consent_type"
        case active
    }
}

struct MagicMirrorGreeting: Codable {
    let greetingTextHe: String
    let greetingTextEn: String
    let vocabularyWords: [VocabWord]

    enum CodingKeys: String, CodingKey {
        case greetingTextHe = "greeting_text_he"
        case greetingTextEn = "greeting_text_en"
        case vocabularyWords = "vocabulary_words"
    }
}

struct VocabWord: Codable {
    let wordHe: String
    let transliteration: String
    let translation: String

    enum CodingKeys: String, CodingKey {
        case wordHe = "word_he"
        case transliteration, translation
    }
}
