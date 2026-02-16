import BayitCore
import BayitNetworking
import Foundation

/// Feature Validation Service - Server-Side Security
///
/// This service enforces server-side validation for security-critical features.
/// Client-side Info.plist flags are UI hints only - this service provides
/// the authoritative validation that cannot be bypassed.
///
/// **Security Architecture:**
/// - Client checks Info.plist flag (fast, optimistic UI)
/// - Client calls this service for server validation (authoritative)
/// - Feature only executes if BOTH client flag AND server validation pass
///
/// **Critical Features Requiring Validation:**
/// - Beta 500 (credit tracking)
/// - Family Controls (child safety)
/// - Premium features (subscription entitlement)
/// - AI features (cost control)
final class FeatureValidationService {

    // MARK: - Types

    enum FeatureName: String, Codable {
        case beta500 = "beta_500"
        case familyControls = "family_controls"
        case liveDubbing = "live_dubbing"
        case audiobooks = "audiobooks"
        case llmSearch = "llm_search"
        case rewards = "rewards"
        case household = "household"
        case carPlay = "carplay"
        case avatarMode = "avatar_mode"
        case proactiveVoice = "proactive_voice"
        case devicePairing = "device_pairing"
        case trivia = "trivia"
        case wakeWord = "wake_word"
        case legacyFeatures = "legacy_features"
        case chapterNavigation = "chapter_navigation"
        case interactiveSubtitles = "interactive_subtitles"
        case shabbatMode = "shabbat_mode"
    }

    struct ValidationResult: Codable {
        let feature: String
        let enabled: Bool
        let reason: String?
        let metadata: [String: AnyCodable]?
    }

    struct BatchValidationRequest: Codable {
        let features: [FeatureName]
    }

    struct BatchValidationResponse: Codable {
        let results: [ValidationResult]
    }

    struct DeductCreditRequest: Codable {
        let feature: String
    }

    struct DeductCreditResponse: Codable {
        let success: Bool
        let remainingCredits: Int
        let message: String

        enum CodingKeys: String, CodingKey {
            case success
            case remainingCredits = "remaining_credits"
            case message
        }
    }

    // MARK: - Properties

    private let apiClient: APIClient
    private let logger = BayitLogger(category: "FeatureValidation")

    // MARK: - Initialization

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Public API

    /// Validate single feature with server-side security check.
    ///
    /// **Usage:**
    /// ```swift
    /// let result = try await featureValidation.validate(.beta500)
    /// if result.enabled {
    ///     // Execute feature
    /// } else {
    ///     // Show upgrade prompt or error
    ///     print("Feature disabled: \(result.reason ?? "unknown")")
    /// }
    /// ```
    ///
    /// - Parameter feature: Feature to validate
    /// - Returns: ValidationResult with enabled status and reason
    /// - Throws: APIError if request fails
    func validate(_ feature: FeatureName) async throws -> ValidationResult {
        logger.info("Validating feature", context: ["feature": feature.rawValue])

        let endpoint = "/features/validate/\(feature.rawValue)"
        let result: ValidationResult = try await apiClient.post(
            endpoint, body: EmptyBody(), as: ValidationResult.self
        )

        logger.info(
            "Feature validation result",
            context: [
                "feature": feature.rawValue,
                "enabled": String(result.enabled),
                "reason": result.reason ?? "none"
            ]
        )

        return result
    }

    /// Validate multiple features in single request (optimization).
    ///
    /// **Usage:**
    /// ```swift
    /// let features: [FeatureName] = [.beta500, .liveDubbing, .familyControls]
    /// let response = try await featureValidation.validateBatch(features)
    ///
    /// for result in response.results {
    ///     print("\(result.feature): \(result.enabled)")
    /// }
    /// ```
    ///
    /// - Parameter features: Array of features to validate
    /// - Returns: BatchValidationResponse with results for each feature
    /// - Throws: APIError if request fails
    func validateBatch(_ features: [FeatureName]) async throws -> BatchValidationResponse {
        logger.info("Batch validating features", context: ["count": String(features.count)])

        let request = BatchValidationRequest(features: features)
        let response: BatchValidationResponse = try await apiClient.post(
            "/features/validate/batch",
            body: request,
            as: BatchValidationResponse.self
        )

        logger.info(
            "Batch validation complete",
            context: [
                "total": String(response.results.count),
                "enabled": String(response.results.filter { $0.enabled }.count)
            ]
        )

        return response
    }

    /// Deduct Beta 500 credit for AI feature usage.
    ///
    /// **CRITICAL:** This MUST be called BEFORE executing any AI-powered feature.
    /// Credits are deducted server-side to prevent client tampering.
    ///
    /// **Usage:**
    /// ```swift
    /// // Before AI search
    /// do {
    ///     let response = try await featureValidation.deductCredit(for: "ai_search")
    ///     print("Credits remaining: \(response.remainingCredits)")
    ///     // Execute AI search
    /// } catch {
    ///     // Show "insufficient credits" error
    /// }
    /// ```
    ///
    /// - Parameter feature: Feature name (for usage tracking)
    /// - Returns: DeductCreditResponse with remaining credits
    /// - Throws: APIError (403 if insufficient credits)
    func deductCredit(for feature: String) async throws -> DeductCreditResponse {
        logger.info("Deducting credit", context: ["feature": feature])

        let request = DeductCreditRequest(feature: feature)
        let response: DeductCreditResponse = try await apiClient.post(
            "/features/deduct-credit",
            body: request,
            as: DeductCreditResponse.self
        )

        logger.info(
            "Credit deducted",
            context: [
                "feature": feature,
                "remaining": String(response.remainingCredits)
            ]
        )

        return response
    }
}

// MARK: - Helper Types

private struct EmptyBody: Codable {}

/// Type-erased codable value for flexible metadata
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported type"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let bool as Bool:
            try container.encode(bool)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "Unsupported type"
                )
            )
        }
    }
}
