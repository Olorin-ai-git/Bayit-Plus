import BayitNetworking
import Foundation

protocol GrandparentBridgeRepository: Sendable {

    func generateClip(
        profileId: String, avatarId: String,
        sessionSummary: [String: Any]
    ) async throws -> BridgeNewsClip

    func fetchClips(
        profileId: String, limit: Int, offset: Int
    ) async throws -> [BridgeNewsClip]

    func shareClip(
        clipId: String, recipientName: String, language: String
    ) async throws -> BridgeShareResult
}

final class APIGrandparentBridgeRepository: GrandparentBridgeRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func generateClip(
        profileId: String, avatarId: String,
        sessionSummary: [String: Any]
    ) async throws -> BridgeNewsClip {
        let body: [String: Any] = [
            "profile_id": profileId,
            "avatar_id": avatarId,
            "session_summary": sessionSummary,
        ]
        return try await client.postJSON(
            "/api/v1/grandparent-bridge/generate-clip",
            body: body,
            as: BridgeNewsClip.self
        )
    }

    func fetchClips(
        profileId: String, limit: Int, offset: Int
    ) async throws -> [BridgeNewsClip] {
        return try await client.get(
            "/api/v1/grandparent-bridge/clips?profile_id=\(profileId)&limit=\(limit)&offset=\(offset)",
            as: [BridgeNewsClip].self
        )
    }

    func shareClip(
        clipId: String, recipientName: String, language: String
    ) async throws -> BridgeShareResult {
        let body: [String: Any] = [
            "recipient_name": recipientName,
            "language": language,
        ]
        return try await client.postJSON(
            "/api/v1/grandparent-bridge/\(clipId)/share",
            body: body,
            as: BridgeShareResult.self
        )
    }
}

struct BridgeNewsClip: Codable, Identifiable {
    let id: String
    let avatarId: String
    let scriptText: String
    let scriptTextHe: String
    let vocabularyFeatured: [String]
    let videoGcsPath: String?
    let thumbnailGcsPath: String?
    let shareUrl: String?
    let whatsappSent: Bool
    let status: String
    let creditsCharged: Int
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case avatarId = "avatar_id"
        case scriptText = "script_text"
        case scriptTextHe = "script_text_he"
        case vocabularyFeatured = "vocabulary_featured"
        case videoGcsPath = "video_gcs_path"
        case thumbnailGcsPath = "thumbnail_gcs_path"
        case shareUrl = "share_url"
        case whatsappSent = "whatsapp_sent"
        case status
        case creditsCharged = "credits_charged"
        case createdAt = "created_at"
    }
}

struct BridgeShareResult: Codable {
    let clipId: String
    let shareUrl: String?
    let whatsappLink: String

    enum CodingKeys: String, CodingKey {
        case clipId = "clip_id"
        case shareUrl = "share_url"
        case whatsappLink = "whatsapp_link"
    }
}
