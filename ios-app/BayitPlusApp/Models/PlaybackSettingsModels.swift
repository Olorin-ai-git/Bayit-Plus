import Foundation

// MARK: - Playback Preferences

/// Response/request model matching backend PlaybackPreferences schema.
struct PlaybackPreferencesDTO: Codable, Sendable {
    let videoQuality: String?
    let autoplay: Bool?
    let autoplayNextEpisode: Bool?
    let autoplayCountdownSeconds: Int?
    let continueWatching: Bool?
    let skipIntro: Bool?
    let skipCredits: Bool?
    let playbackSpeed: Double?
    let liveBufferSeconds: Int?
    let hardwareAcceleration: Bool?

    enum CodingKeys: String, CodingKey {
        case videoQuality = "video_quality"
        case autoplay
        case autoplayNextEpisode = "autoplay_next_episode"
        case autoplayCountdownSeconds = "autoplay_countdown_seconds"
        case continueWatching = "continue_watching"
        case skipIntro = "skip_intro"
        case skipCredits = "skip_credits"
        case playbackSpeed = "playback_speed"
        case liveBufferSeconds = "live_buffer_seconds"
        case hardwareAcceleration = "hardware_acceleration"
    }
}

/// Wrapper for the update response from the backend.
struct PlaybackPreferencesResponse: Decodable, Sendable {
    let message: String?
    let preferences: PlaybackPreferencesDTO?
}

// MARK: - Audio Preferences

/// Response/request model matching backend AudioPreferences schema.
struct AudioPreferencesDTO: Codable, Sendable {
    let preferredLanguage: String?
    let quality: String?
    let volumeNormalization: Bool?
    let preferDubbed: Bool?
    let dubbingLanguage: String?

    enum CodingKeys: String, CodingKey {
        case preferredLanguage = "preferred_language"
        case quality
        case volumeNormalization = "volume_normalization"
        case preferDubbed = "prefer_dubbed"
        case dubbingLanguage = "dubbing_language"
    }
}

/// Wrapper for the update response from the backend.
struct AudioPreferencesResponse: Decodable, Sendable {
    let message: String?
    let preferences: AudioPreferencesDTO?
}

// MARK: - Accessibility Preferences

/// Response/request model matching backend AccessibilityPreferences.
struct AccessibilityPreferencesDTO: Codable, Sendable {
    let largeText: Bool?
    let boldText: Bool?
    let highContrast: Bool?
    let reduceMotion: Bool?
    let audioDescriptions: Bool?
    let closedCaptions: Bool?
    let colorBlindMode: String?

    enum CodingKeys: String, CodingKey {
        case largeText = "large_text"
        case boldText = "bold_text"
        case highContrast = "high_contrast"
        case reduceMotion = "reduce_motion"
        case audioDescriptions = "audio_descriptions"
        case closedCaptions = "closed_captions"
        case colorBlindMode = "color_blind_mode"
    }
}

/// Wrapper for the update response from the backend.
struct AccessibilityPreferencesResponse: Decodable, Sendable {
    let message: String?
    let preferences: AccessibilityPreferencesDTO?
}

// MARK: - Privacy Preferences

/// Response/request model matching backend PrivacyPreferences.
struct PrivacyPreferencesDTO: Codable, Sendable {
    let analyticsEnabled: Bool?
    let crashReports: Bool?
    let personalization: Bool?
    let watchHistoryEnabled: Bool?
    let searchHistoryEnabled: Bool?

    enum CodingKeys: String, CodingKey {
        case analyticsEnabled = "analytics_enabled"
        case crashReports = "crash_reports"
        case personalization
        case watchHistoryEnabled = "watch_history_enabled"
        case searchHistoryEnabled = "search_history_enabled"
    }
}

/// Wrapper for the update response from the backend.
struct PrivacyPreferencesResponse: Decodable, Sendable {
    let message: String?
    let preferences: PrivacyPreferencesDTO?
}

// MARK: - Video Quality Options

/// Available video quality options for streaming.
enum VideoQuality: String, CaseIterable, Identifiable {
    case auto
    case uhd4k = "4k"
    case fullHD = "1080p"
    case hd = "720p"
    case sd = "480p"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .auto: return String(localized: "settings.playback.qualityAuto")
        case .uhd4k: return "4K Ultra HD"
        case .fullHD: return "1080p Full HD"
        case .hd: return "720p HD"
        case .sd: return "480p SD"
        }
    }
}

// MARK: - Audio Quality Options

/// Available audio quality options.
enum AudioQuality: String, CaseIterable, Identifiable {
    case auto
    case high
    case medium
    case low

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .auto: return String(localized: "settings.audio.qualityAuto")
        case .high: return String(localized: "settings.audio.qualityHigh")
        case .medium: return String(localized: "settings.audio.qualityMedium")
        case .low: return String(localized: "settings.audio.qualityLow")
        }
    }
}

// MARK: - Color Blind Mode Options

/// Color blind mode options for accessibility.
enum ColorBlindMode: String, CaseIterable, Identifiable {
    case none
    case protanopia
    case deuteranopia
    case tritanopia

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .none: return String(localized: "settings.accessibility.colorBlindNone")
        case .protanopia: return String(localized: "settings.accessibility.protanopia")
        case .deuteranopia: return String(localized: "settings.accessibility.deuteranopia")
        case .tritanopia: return String(localized: "settings.accessibility.tritanopia")
        }
    }
}
