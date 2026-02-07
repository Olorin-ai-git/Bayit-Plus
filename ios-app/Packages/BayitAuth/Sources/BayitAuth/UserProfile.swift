import Foundation

/// Profile preferences for content filtering and display.
public struct ProfilePreferences: Codable, Sendable {
    public let language: String?
    public let subtitleLanguage: String?
    public let autoplayEnabled: Bool
    public let contentRatingLimit: Int?

    private enum CodingKeys: String, CodingKey {
        case language
        case subtitleLanguage = "subtitle_language"
        case autoplayEnabled = "autoplay_enabled"
        case contentRatingLimit = "content_rating_limit"
    }

    public init(
        language: String? = nil,
        subtitleLanguage: String? = nil,
        autoplayEnabled: Bool = true,
        contentRatingLimit: Int? = nil
    ) {
        self.language = language
        self.subtitleLanguage = subtitleLanguage
        self.autoplayEnabled = autoplayEnabled
        self.contentRatingLimit = contentRatingLimit
    }
}

/// User profile for multi-profile support.
///
/// Maps to the profile model from `shared/stores/profileStore.js`.
/// Each user account can have multiple profiles (e.g., family members, kids).
public struct UserProfile: Codable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let avatarURL: URL?
    public let isChild: Bool
    public let ageRating: Int?
    public let preferences: ProfilePreferences
    public let hasPin: Bool

    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case avatarURL = "avatar"
        case isChild = "is_kids_profile"
        case ageRating = "age_rating"
        case preferences
        case hasPin = "has_pin"
    }

    public init(
        id: String,
        name: String,
        avatarURL: URL?,
        isChild: Bool,
        ageRating: Int?,
        preferences: ProfilePreferences,
        hasPin: Bool
    ) {
        self.id = id
        self.name = name
        self.avatarURL = avatarURL
        self.isChild = isChild
        self.ageRating = ageRating
        self.preferences = preferences
        self.hasPin = hasPin
    }
}
