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
        language: String,
        pin: String
    ) async throws -> WhatsAppContactItem

    func removeContact(
        contactId: String
    ) async throws -> Bool

    func getFeedbackHistory(
        profileId: String
    ) async throws -> [FeedbackItem]

    func sendHighlightReelToContacts(
        reelId: String
    ) async throws -> Int

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
        language: String,
        pin: String
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
            pin: pin
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

    func sendHighlightReelToContacts(
        reelId: String
    ) async throws -> Int {
        struct SendResponse: Decodable { let sentCount: Int
            enum CodingKeys: String, CodingKey { case sentCount = "sent_count" }
        }
        let response = try await client.post(
            "/api/v1/zeh-ani/highlights/reel/\(reelId)/send",
            body: EmptyBody(),
            as: SendResponse.self
        )
        return response.sentCount
    }

}
