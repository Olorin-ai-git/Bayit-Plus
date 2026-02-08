import BayitCore
import BayitNetworking
import Foundation

/// Lightweight client for the Profiles API endpoints.
///
/// Uses raw URLSession to avoid circular dependency with APIClient.
/// Maps to `GET/POST /api/v1/profiles` on the backend.
enum ProfilesClient {

    // MARK: - Request / Response Models

    struct ProfileCreateRequest: Encodable {
        let name: String
        let avatarColor: String
        let isKidsProfile: Bool
        let kidsAgeLimit: Int?
        let pin: String?

        private enum CodingKeys: String, CodingKey {
            case name
            case avatarColor = "avatar_color"
            case isKidsProfile = "is_kids_profile"
            case kidsAgeLimit = "kids_age_limit"
            case pin
        }
    }

    struct ProfileListResponse: Decodable {
        let id: String
        let name: String
        let avatar: String?
        let avatarColor: String
        let isKidsProfile: Bool
        let kidsAgeLimit: Int?
        let hasPin: Bool
        let preferences: ProfilePreferencesResponse

        private enum CodingKeys: String, CodingKey {
            case id
            case name
            case avatar
            case avatarColor = "avatar_color"
            case isKidsProfile = "is_kids_profile"
            case kidsAgeLimit = "kids_age_limit"
            case hasPin = "has_pin"
            case preferences
        }

        func toUserProfile() -> UserProfile {
            UserProfile(
                id: id,
                name: name,
                avatarURL: avatar.flatMap { URL(string: $0) },
                isChild: isKidsProfile,
                ageRating: kidsAgeLimit,
                preferences: ProfilePreferences(
                    language: preferences.language,
                    subtitleLanguage: preferences.subtitleLanguage,
                    autoplayEnabled: preferences.autoplayNext ?? true,
                    contentRatingLimit: nil
                ),
                hasPin: hasPin
            )
        }
    }

    struct ProfilePreferencesResponse: Decodable {
        let language: String?
        let subtitleLanguage: String?
        let autoplayNext: Bool?

        private enum CodingKeys: String, CodingKey {
            case language
            case subtitleLanguage = "subtitle_language"
            case autoplayNext = "autoplay_next"
        }
    }

    // MARK: - Fetch Profiles

    /// Fetches all profiles for the authenticated user.
    ///
    /// Maps to `GET /api/v1/profiles`.
    static func fetchProfiles(
        token: String,
        logger: APILogger
    ) async throws -> [UserProfile] {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("profiles")

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout

        logger.debug(
            "Fetching profiles from backend",
            metadata: ["url": url.absoluteString]
        )

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.profileLoadFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let body = String(data: data, encoding: .utf8) ?? "empty"
            logger.warning(
                "Profiles fetch failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "response": String(body.prefix(200)),
                ]
            )
            throw AuthError.profileLoadFailed(
                underlying: "HTTP \(httpResponse.statusCode)"
            )
        }

        let profiles = try JSONDecoder().decode(
            [ProfileListResponse].self, from: data
        )

        logger.debug(
            "Profiles fetched successfully",
            metadata: ["count": String(profiles.count)]
        )

        return profiles.map { $0.toUserProfile() }
    }

    // MARK: - Create Profile

    /// Creates a new profile for the authenticated user.
    ///
    /// Maps to `POST /api/v1/profiles`.
    static func createProfile(
        request createRequest: ProfileCreateRequest,
        token: String,
        logger: APILogger
    ) async throws -> UserProfile {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("profiles")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout
        request.httpBody = try JSONEncoder().encode(createRequest)

        logger.debug(
            "Creating profile on backend",
            metadata: ["name": createRequest.name]
        )

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.profileCreateFailed(underlying: "Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let body = String(data: data, encoding: .utf8) ?? "empty"
            logger.warning(
                "Profile creation failed",
                metadata: [
                    "status_code": String(httpResponse.statusCode),
                    "response": String(body.prefix(200)),
                ]
            )

            // Extract detail message from backend error response
            if let errorJSON = try? JSONDecoder().decode(
                ErrorDetailResponse.self, from: data
            ) {
                throw AuthError.profileCreateFailed(underlying: errorJSON.detail)
            }

            throw AuthError.profileCreateFailed(
                underlying: "HTTP \(httpResponse.statusCode)"
            )
        }

        let profile = try JSONDecoder().decode(
            ProfileListResponse.self, from: data
        )

        logger.info(
            "Profile created successfully",
            metadata: ["profile_id": profile.id, "name": profile.name]
        )

        return profile.toUserProfile()
    }
}

/// Minimal error response from the backend.
private struct ErrorDetailResponse: Decodable {
    let detail: String
}
