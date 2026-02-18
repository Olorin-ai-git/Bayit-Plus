import BayitCore
import Foundation
import Observation

/// ViewModel for privacy settings: analytics, crash reports,
/// personalization, watch/search history, and GDPR data operations.
@MainActor
@Observable
final class PrivacySettingsViewModel {
    private(set) var isLoading = false
    private(set) var isSaving = false
    private(set) var error: String?
    private(set) var successMessage: String?
    private(set) var isClearingWatchHistory = false
    private(set) var isClearingSearchHistory = false

    var analyticsEnabled = true
    var crashReports = true
    var personalization = true
    var watchHistoryEnabled = true
    var searchHistoryEnabled = true

    private let repository: any UserSettingsRepository
    private let logger = BayitLogger(category: "PrivacySettingsViewModel")

    init(repository: any UserSettingsRepository) {
        self.repository = repository
    }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let prefs = try await repository.fetchPrivacyPreferences()
            syncLocalState(from: prefs)
            logger.info("Loaded privacy preferences")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load privacy preferences", error: error)
        }

        isLoading = false
    }

    func save() async {
        isSaving = true
        error = nil

        let request = PrivacyPreferencesDTO(
            analyticsEnabled: analyticsEnabled,
            crashReports: crashReports,
            personalization: personalization,
            watchHistoryEnabled: watchHistoryEnabled,
            searchHistoryEnabled: searchHistoryEnabled
        )

        do {
            _ = try await repository.updatePrivacyPreferences(request: request)
            logger.info("Saved privacy preferences")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to save privacy preferences", error: error)
        }

        isSaving = false
    }

    func clearWatchHistory() async {
        isClearingWatchHistory = true
        error = nil
        successMessage = nil

        do {
            let response = try await repository.clearWatchHistory()
            successMessage = response.message
            logger.info("Cleared watch history")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to clear watch history", error: error)
        }

        isClearingWatchHistory = false
    }

    func clearSearchHistory() async {
        isClearingSearchHistory = true
        error = nil
        successMessage = nil

        do {
            let response = try await repository.clearSearchHistory()
            successMessage = response.message
            logger.info("Cleared search history")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to clear search history", error: error)
        }

        isClearingSearchHistory = false
    }

    // MARK: - Private

    private func syncLocalState(from prefs: PrivacyPreferencesDTO) {
        analyticsEnabled = prefs.analyticsEnabled ?? true
        crashReports = prefs.crashReports ?? true
        personalization = prefs.personalization ?? true
        watchHistoryEnabled = prefs.watchHistoryEnabled ?? true
        searchHistoryEnabled = prefs.searchHistoryEnabled ?? true
    }
}
