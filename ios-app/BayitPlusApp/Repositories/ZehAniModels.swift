import Foundation

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
