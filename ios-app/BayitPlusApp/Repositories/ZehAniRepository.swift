import BayitNetworking
import Foundation

protocol ZehAniRepository: Sendable {

    func listHighlightReels(
        profileId: String
    ) async throws -> [HighlightReelItem]

    func generateHighlightReel(
        profileId: String
    ) async throws -> HighlightReelItem

    func listContacts(
        profileId: String
    ) async throws -> [WhatsAppContactItem]

    func addContact(
        profileId: String,
        phoneNumber: String,
        displayName: String,
        relationship: String,
        language: String
    ) async throws -> WhatsAppContactItem

    func removeContact(
        contactId: String
    ) async throws -> Bool

    func getFeedbackHistory(
        profileId: String
    ) async throws -> [FeedbackItem]
}

final class APIZehAniRepository: ZehAniRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func listHighlightReels(
        profileId: String
    ) async throws -> [HighlightReelItem] {
        return try await client.get(
            "/api/v1/zeh-ani/highlights/\(profileId)",
            as: [HighlightReelItem].self
        )
    }

    func generateHighlightReel(
        profileId: String
    ) async throws -> HighlightReelItem {
        struct GenerateRequest: Codable {
            let avatarId: String
            let profileId: String

            enum CodingKeys: String, CodingKey {
                case avatarId = "avatar_id"
                case profileId = "profile_id"
            }
        }
        let body = GenerateRequest(avatarId: profileId, profileId: profileId)
        return try await client.post(
            "/api/v1/zeh-ani/highlights/generate",
            body: body,
            as: HighlightReelItem.self
        )
    }

    func listContacts(
        profileId: String
    ) async throws -> [WhatsAppContactItem] {
        return try await client.get(
            "/api/v1/zeh-ani/contacts/\(profileId)",
            as: [WhatsAppContactItem].self
        )
    }

    func addContact(
        profileId: String,
        phoneNumber: String,
        displayName: String,
        relationship: String,
        language: String
    ) async throws -> WhatsAppContactItem {
        struct AddContactRequest: Codable {
            let profileId: String
            let phoneNumber: String
            let displayName: String
            let relationship: String
            let language: String
            let pin: String

            enum CodingKeys: String, CodingKey {
                case profileId = "profile_id"
                case phoneNumber = "phone_number"
                case displayName = "display_name"
                case relationship
                case language
                case pin
            }
        }
        let body = AddContactRequest(
            profileId: profileId,
            phoneNumber: phoneNumber,
            displayName: displayName,
            relationship: relationship,
            language: language,
            pin: ""
        )
        return try await client.post(
            "/api/v1/zeh-ani/contacts",
            body: body,
            as: WhatsAppContactItem.self
        )
    }

    func removeContact(
        contactId: String
    ) async throws -> Bool {
        struct DeleteResponse: Decodable {
            let success: Bool
        }
        let response = try await client.delete(
            "/api/v1/zeh-ani/contacts/\(contactId)",
            as: DeleteResponse.self
        )
        return response.success
    }

    func getFeedbackHistory(
        profileId: String
    ) async throws -> [FeedbackItem] {
        return try await client.get(
            "/api/v1/zeh-ani/feedback?profile_id=\(profileId)",
            as: [FeedbackItem].self
        )
    }
}

struct HighlightReelItem: Codable, Identifiable {
    let id: String
    let profileId: String
    let momentCount: Int
    let thumbnailUrl: String?
    let videoUrl: String?
    let shareToken: String?
    let status: String
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case profileId = "profile_id"
        case momentCount = "moment_count"
        case thumbnailUrl = "thumbnail_url"
        case videoUrl = "video_url"
        case shareToken = "share_token"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct WhatsAppContactItem: Codable, Identifiable {
    let id: String
    let profileId: String
    let displayName: String
    let phoneNumber: String
    let relationship: String
    let language: String
    let totalReelsSent: Int
    let lastSentAt: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case profileId = "profile_id"
        case displayName = "display_name"
        case phoneNumber = "phone_number"
        case relationship
        case language
        case totalReelsSent = "total_reels_sent"
        case lastSentAt = "last_sent_at"
        case createdAt = "created_at"
    }
}

struct FeedbackItem: Codable, Identifiable {
    let id: String
    let profileId: String
    let contactName: String
    let transcriptText: String?
    let detectedLanguage: String?
    let audioUrl: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case profileId = "profile_id"
        case contactName = "contact_name"
        case transcriptText = "transcript_text"
        case detectedLanguage = "detected_language"
        case audioUrl = "audio_url"
        case createdAt = "created_at"
    }
}
