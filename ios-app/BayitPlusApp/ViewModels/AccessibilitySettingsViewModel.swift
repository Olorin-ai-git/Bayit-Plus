import BayitCore
import Foundation
import Observation

/// ViewModel for accessibility settings: large text, bold text, high contrast,
/// reduce motion, audio descriptions, closed captions, and color blind mode.
@MainActor
@Observable
final class AccessibilitySettingsViewModel {
    private(set) var isLoading = false
    private(set) var isSaving = false
    private(set) var error: String?

    var largeText = false
    var boldText = false
    var highContrast = false
    var reduceMotion = false
    var audioDescriptions = false
    var closedCaptions = false
    var colorBlindMode: ColorBlindMode = .none

    private let repository: any UserSettingsRepository
    private let logger = BayitLogger(category: "AccessibilitySettingsVM")

    init(repository: any UserSettingsRepository) {
        self.repository = repository
    }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let prefs = try await repository.fetchAccessibilityPreferences()
            syncLocalState(from: prefs)
            logger.info("Loaded accessibility preferences")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load accessibility prefs", error: error)
        }

        isLoading = false
    }

    func save() async {
        isSaving = true
        error = nil

        let request = AccessibilityPreferencesDTO(
            largeText: largeText,
            boldText: boldText,
            highContrast: highContrast,
            reduceMotion: reduceMotion,
            audioDescriptions: audioDescriptions,
            closedCaptions: closedCaptions,
            colorBlindMode: colorBlindMode.rawValue
        )

        do {
            _ = try await repository.updateAccessibilityPreferences(
                request: request
            )
            logger.info("Saved accessibility preferences")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to save accessibility prefs", error: error)
        }

        isSaving = false
    }

    // MARK: - Private

    private func syncLocalState(from prefs: AccessibilityPreferencesDTO) {
        largeText = prefs.largeText ?? false
        boldText = prefs.boldText ?? false
        highContrast = prefs.highContrast ?? false
        reduceMotion = prefs.reduceMotion ?? false
        audioDescriptions = prefs.audioDescriptions ?? false
        closedCaptions = prefs.closedCaptions ?? false
        if let mode = prefs.colorBlindMode {
            colorBlindMode = ColorBlindMode(rawValue: mode) ?? .none
        }
    }
}
