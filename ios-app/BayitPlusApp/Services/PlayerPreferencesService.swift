import BayitCore
import Foundation

/// Persists player settings (quality, subtitle language, audio language,
/// auto-play, playback rate) in UserDefaults so they survive app restarts.
struct PlayerPreferencesService: Sendable {

    private enum Keys {
        static let preferredQuality = "bayit_player_preferred_quality"
        static let preferredSubtitleLanguage = "bayit_player_preferred_subtitle_lang"
        static let preferredAudioLanguage = "bayit_player_preferred_audio_lang"
        static let autoPlayNextEpisode = "bayit_player_auto_play_next"
        static let preferredPlaybackRate = "bayit_player_playback_rate"
    }

    enum Defaults {
        static let quality = "auto"
        static let playbackRate: Float = 1.0
    }

    private let logger = BayitLogger(category: "PlayerPreferences")

    // MARK: - Quality

    var preferredQuality: String {
        get { UserDefaults.standard.string(forKey: Keys.preferredQuality) ?? Defaults.quality }
        nonmutating set {
            UserDefaults.standard.set(newValue, forKey: Keys.preferredQuality)
            logger.debug("Saved preferred quality", context: ["quality": newValue])
        }
    }

    // MARK: - Subtitle Language

    var preferredSubtitleLanguage: String? {
        get { UserDefaults.standard.string(forKey: Keys.preferredSubtitleLanguage) }
        nonmutating set {
            UserDefaults.standard.set(newValue, forKey: Keys.preferredSubtitleLanguage)
            logger.debug("Saved preferred subtitle language", context: [
                "language": newValue ?? "none"
            ])
        }
    }

    // MARK: - Audio Language

    var preferredAudioLanguage: String? {
        get { UserDefaults.standard.string(forKey: Keys.preferredAudioLanguage) }
        nonmutating set {
            UserDefaults.standard.set(newValue, forKey: Keys.preferredAudioLanguage)
            logger.debug("Saved preferred audio language", context: [
                "language": newValue ?? "none"
            ])
        }
    }

    // MARK: - Auto-Play Next

    var autoPlayNextEpisode: Bool {
        get {
            // Default to true if not set
            if UserDefaults.standard.object(forKey: Keys.autoPlayNextEpisode) == nil {
                return true
            }
            return UserDefaults.standard.bool(forKey: Keys.autoPlayNextEpisode)
        }
        nonmutating set {
            UserDefaults.standard.set(newValue, forKey: Keys.autoPlayNextEpisode)
            logger.debug("Saved auto-play next", context: ["enabled": String(newValue)])
        }
    }

    // MARK: - Playback Rate

    var preferredPlaybackRate: Float {
        get {
            let rate = UserDefaults.standard.float(forKey: Keys.preferredPlaybackRate)
            return rate > 0 ? rate : Defaults.playbackRate
        }
        nonmutating set {
            UserDefaults.standard.set(newValue, forKey: Keys.preferredPlaybackRate)
            logger.debug("Saved playback rate", context: ["rate": String(newValue)])
        }
    }
}
