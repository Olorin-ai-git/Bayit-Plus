import BayitCore
import BayitNetworking
import Foundation

// MARK: - Legacy Fetch & Error Handling

extension CatchUpViewModel {
    /// Load the legacy catch-up endpoint for transcript segments.
    func loadCatchUp(channelId: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchCatchUp(
                channelId: channelId
            )
            segments = response.segments ?? []
            legacySummary = response.summary
            logger.info("Legacy catch-up loaded", context: [
                "channelId": channelId,
                "segmentCount": "\(segments.count)",
            ])
        } catch {
            self.error = localization.t("catchup.error.loadFailed")
            logger.error("Legacy catch-up load failed", error: error)
        }

        isLoading = false
    }

    func handleAPIError(_ apiError: APIError) {
        switch apiError {
        case .paymentRequired:
            error = localization.t("catchup.error.insufficientCredits")
            errorType = .insufficientCredits
            hasCredits = false
        case let .serverError(statusCode, _) where statusCode == 503:
            error = localization.t("catchup.error.serviceUnavailable")
            errorType = .serviceUnavailable
        default:
            error = apiError.localizedDescription
            errorType = .general
        }
        logger.error("API error during summary", error: apiError)
    }
}
