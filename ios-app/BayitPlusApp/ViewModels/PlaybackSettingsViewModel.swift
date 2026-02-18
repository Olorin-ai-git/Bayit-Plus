import BayitCore
import Foundation
import Observation

/// ViewModel for playback settings: video quality, autoplay, skip intro/credits,
/// playback speed, continue watching, and live TV buffer size.
@MainActor
@Observable
final class PlaybackSettingsViewModel {
    private(set) var isLoading = false
    private(set) var isSaving = false
    private(set) var error: String?

    var videoQuality: VideoQuality = .auto
    var autoplay = true
    var autoplayNextEpisode = true
    var autoplayCountdownSeconds = 5
    var continueWatching = true
    var skipIntro = false
    var skipCredits = false
    var playbackSpeed: Double = 1.0
    var liveBufferSeconds = 30

    private let repository: any UserSettingsRepository
    private let logger = BayitLogger(category: "PlaybackSettingsViewModel")

    init(repository: any UserSettingsRepository) {
        self.repository = repository
    }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let prefs = try await repository.fetchPlaybackPreferences()
            syncLocalState(from: prefs)
            logger.info("Loaded playback preferences")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load playback preferences", error: error)
        }

        isLoading = false
    }

    func save() async {
        isSaving = true
        error = nil

        let request = PlaybackPreferencesDTO(
            videoQuality: videoQuality.rawValue,
            autoplay: autoplay,
            autoplayNextEpisode: autoplayNextEpisode,
            autoplayCountdownSeconds: autoplayCountdownSeconds,
            continueWatching: continueWatching,
            skipIntro: skipIntro,
            skipCredits: skipCredits,
            playbackSpeed: playbackSpeed,
            liveBufferSeconds: liveBufferSeconds,
            hardwareAcceleration: true
        )

        do {
            _ = try await repository.updatePlaybackPreferences(request: request)
            logger.info("Saved playback preferences")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to save playback preferences", error: error)
        }

        isSaving = false
    }

    // MARK: - Private

    private func syncLocalState(from prefs: PlaybackPreferencesDTO) {
        if let quality = prefs.videoQuality {
            videoQuality = VideoQuality(rawValue: quality) ?? .auto
        }
        autoplay = prefs.autoplay ?? true
        autoplayNextEpisode = prefs.autoplayNextEpisode ?? true
        autoplayCountdownSeconds = prefs.autoplayCountdownSeconds ?? 5
        continueWatching = prefs.continueWatching ?? true
        skipIntro = prefs.skipIntro ?? false
        skipCredits = prefs.skipCredits ?? false
        playbackSpeed = prefs.playbackSpeed ?? 1.0
        liveBufferSeconds = prefs.liveBufferSeconds ?? 30
    }
}
