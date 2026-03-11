import BayitCore
import BayitNetworking
import Foundation

// MARK: - Legacy Fetch & Error Handling

extension CatchUpViewModel {
    /// Load catch-up summary and transcript segments for a channel.
    func loadCatchUp(
        channelId: String,
        targetLanguage: String = "en",
        windowMinutes: Int = 30
    ) async {
        isLoading = true
        error = nil
        errorType = .none

        do {
            let response = try await repository.fetchCatchUpSummary(
                channelId: channelId,
                windowMinutes: windowMinutes,
                targetLanguage: targetLanguage
            )
            summary = response
            showSummary = true

            if let remaining = response.remainingCredits {
                creditBalance = remaining
                hasCredits = remaining > 0
            }

            logger.info("Catch-up loaded", context: [
                "channelId": channelId,
                "cached": String(response.cached ?? false),
            ])
        } catch let apiError as APIError {
            handleAPIError(apiError)
        } catch {
            self.error = localization.t("catchup.error.loadFailed")
            errorType = .general
            logger.error("Catch-up load failed", error: error)
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
