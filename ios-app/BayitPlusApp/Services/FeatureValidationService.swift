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
                "reason": result.reason ?? "none",
            ]
        )

        return result
    }

    /// Validate multiple features in single request (optimization).
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
                "enabled": String(response.results.filter { $0.enabled }.count),
            ]
        )

        return response
    }

    /// Deduct Beta 500 credit for AI feature usage.
    ///
    /// **CRITICAL:** This MUST be called BEFORE executing any AI-powered feature.
    /// Credits are deducted server-side to prevent client tampering.
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
                "remaining": String(response.remainingCredits),
            ]
        )

        return response
    }
}
