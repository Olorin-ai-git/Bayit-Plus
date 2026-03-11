import BayitCore
import BayitLocalization
import BayitNetworking
import Foundation
import Observation

/// ViewModel for the catch-up feature with auto-prompt, AI summary, credit
/// tracking, and dismiss persistence. Shared across iOS and tvOS.
///
/// Mirrors the web app's `useCatchUp` hook state machine.
@MainActor
@Observable
final class CatchUpViewModel {
    // MARK: - Published State

    /// Whether the auto-prompt overlay should be visible.
    var showAutoPrompt = false

    /// Whether the summary card should be visible.
    var showSummary = false

    /// The loaded AI summary response (nil until fetched).
    var summary: CatchUpSummaryResponse?

    /// Loading indicator for summary generation.
    var isLoading = false

    /// User-facing error message.
    var error: String?

    /// Typed error for UI branching (insufficient credits vs general).
    var errorType: CatchUpErrorType = .none

    /// Whether catch-up is available for this channel/user.
    var isAvailable = false

    /// Whether the user has credits remaining.
    var hasCredits = false

    /// Current credit balance.
    var creditBalance: Int = 0

    // MARK: - Legacy State (backward compat for CatchUpView transcript timeline)

    var segments: [CatchUpSegment] = []
    var legacySummary: String?

    // MARK: - Dependencies

    let repository: any LiveTVRepository
    let preferences: CatchUpPreferencesService
    let localization: LocalizationManager
    let logger: BayitLogger

    // MARK: - Init

    init(
        repository: any LiveTVRepository,
        localization: LocalizationManager,
        preferences: CatchUpPreferencesService = CatchUpPreferencesService(),
        logger: BayitLogger = BayitLogger(category: "CatchUpViewModel")
    ) {
        self.repository = repository
        self.localization = localization
        self.preferences = preferences
        self.logger = logger
    }

    // MARK: - Availability

    /// Check whether catch-up is available for the given channel and user.
    /// If available and not previously dismissed, shows the auto-prompt.
    func checkAvailability(channelId: String, isBetaUser: Bool) async {
        guard isBetaUser else {
            isAvailable = false
            return
        }

        do {
            let response = try await repository.checkCatchUpAvailability(
                channelId: channelId
            )
            isAvailable = response.available
            hasCredits = response.hasCredits ?? false
            creditBalance = response.balance ?? 0

            if response.available, !preferences.isDismissed(channelId: channelId) {
                showAutoPrompt = true
            }

            logger.info("Availability checked", context: [
                "channelId": channelId,
                "available": String(response.available),
                "balance": String(creditBalance),
            ])
        } catch {
            // Availability check failure is non-fatal; hide auto-prompt
            isAvailable = false
            logger.error("Availability check failed", error: error)
        }
    }

    // MARK: - Fetch Summary

    /// Generate an AI catch-up summary, deducting credits server-side.
    func fetchSummary(
        channelId: String,
        windowMinutes: Int,
        targetLanguage: String
    ) async {
        isLoading = true
        error = nil
        errorType = .none
        showAutoPrompt = false

        do {
            let response = try await repository.fetchCatchUpSummary(
                channelId: channelId,
                windowMinutes: windowMinutes,
                targetLanguage: targetLanguage
            )
            summary = response
            showSummary = true

            // Update credit balance from response
            if let remaining = response.remainingCredits {
                creditBalance = remaining
                hasCredits = remaining > 0
            }

            logger.info("Summary loaded", context: [
                "channelId": channelId,
                "cached": String(response.cached ?? false),
                "creditsUsed": String(response.creditsUsed ?? 0),
            ])
        } catch let apiError as APIError {
            handleAPIError(apiError)
        } catch {
            self.error = localization.t("catchup.error.failed")
            errorType = .general
            logger.error("Summary fetch failed", error: error)
        }

        isLoading = false
    }

    // MARK: - User Actions

    /// Dismiss the auto-prompt and persist the preference.
    func dismissAutoPrompt(channelId: String) {
        showAutoPrompt = false
        preferences.setDismissed(channelId: channelId)
        logger.info("Auto-prompt dismissed", context: ["channelId": channelId])
    }

    /// Close the summary card.
    func closeSummary() {
        showSummary = false
    }

    /// Reset all state (channel change or cleanup).
    func reset() {
        showAutoPrompt = false
        showSummary = false
        summary = nil
        isLoading = false
        error = nil
        errorType = .none
        isAvailable = false
        hasCredits = false
        creditBalance = 0
        segments = []
        legacySummary = nil
    }
}
