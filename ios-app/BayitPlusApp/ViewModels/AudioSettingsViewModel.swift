import BayitCore
import Foundation
import Observation

/// ViewModel for audio settings: preferred language, quality,
/// volume normalization, dubbed audio, and dubbing language.
@MainActor
@Observable
final class AudioSettingsViewModel {
    private(set) var isLoading = false
    private(set) var isSaving = false
    private(set) var error: String?

    var preferredLanguage = "he"
    var quality: AudioQuality = .auto
    var volumeNormalization = false
    var preferDubbed = false
    var dubbingLanguage = "en"

    private let repository: any UserSettingsRepository
    private let logger = BayitLogger(category: "AudioSettingsViewModel")

    init(repository: any UserSettingsRepository) {
        self.repository = repository
    }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let prefs = try await repository.fetchAudioPreferences()
            syncLocalState(from: prefs)
            logger.info("Loaded audio preferences")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load audio preferences", error: error)
        }

        isLoading = false
    }

    func save() async {
        isSaving = true
        error = nil

        let request = AudioPreferencesDTO(
            preferredLanguage: preferredLanguage,
            quality: quality.rawValue,
            volumeNormalization: volumeNormalization,
            preferDubbed: preferDubbed,
            dubbingLanguage: dubbingLanguage
        )

        do {
            _ = try await repository.updateAudioPreferences(request: request)
            logger.info("Saved audio preferences")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to save audio preferences", error: error)
        }

        isSaving = false
    }

    // MARK: - Private

    private func syncLocalState(from prefs: AudioPreferencesDTO) {
        preferredLanguage = prefs.preferredLanguage ?? "he"
        if let q = prefs.quality {
            quality = AudioQuality(rawValue: q) ?? .auto
        }
        volumeNormalization = prefs.volumeNormalization ?? false
        preferDubbed = prefs.preferDubbed ?? false
        dubbingLanguage = prefs.dubbingLanguage ?? "en"
    }
}
