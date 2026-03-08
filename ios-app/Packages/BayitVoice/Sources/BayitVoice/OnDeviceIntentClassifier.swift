import Foundation

/// On-device intent classifier for fast-path voice commands.
/// Handles NAVIGATION, PLAYBACK control, SCROLL, and CONTROL
/// intents locally without server round-trip.
/// Keyword dictionaries ported from backend intent_keywords.py.
public struct OnDeviceIntentClassifier: Sendable {
    private static let localConfidence: Double = 0.95

    // MARK: - Playback Control Keywords

    private static let playbackKeywords: [String: [(keyword: String, command: String)]] = [
        "en": [("pause", "pause"), ("stop", "stop"), ("resume", "resume")],
        "he": [("השהה", "pause"), ("עצור", "stop"), ("המשך", "resume")],
        "es": [("pausar", "pause"), ("detener", "stop"), ("reanudar", "resume")],
    ]
    private static let playbackResponses: [String: [String: String]] = [
        "pause": ["en": "Paused", "he": "מושהה", "es": "Pausado"],
        "stop": ["en": "Stopped", "he": "הופסק", "es": "Detenido"],
        "resume": ["en": "Resuming", "he": "ממשיך", "es": "Reanudando"],
    ]

    // MARK: - Navigation Keywords

    private static let navigationKeywords: [String: [(keyword: String, destination: String)]] = [
        "en": [
            ("home", "home"), ("back", "back"), ("channels", "channels"),
            ("movies", "movies"), ("series", "series"), ("radio", "radio"),
            ("podcast", "podcasts"), ("podcasts", "podcasts"), ("audiobooks", "audiobooks"),
        ],
        "he": [
            ("בית", "home"), ("חזור הביתה", "home"), ("עמוד ראשי", "home"),
            ("ערוצים", "channels"), ("שידור חי", "live"), ("סרטים", "movies"),
            ("סדרות", "series"), ("רדיו", "radio"), ("פודקאסטים", "podcasts"),
            ("מועדפים", "favorites"),
        ],
        "es": [
            ("inicio", "home"), ("canales", "channels"),
            ("películas", "movies"), ("series", "series"),
        ],
    ]
    private static let navigationResponseTemplates: [String: String] = [
        "en": "Navigating to {destination}", "he": "מנווט אל {destination}",
        "es": "Navegando a {destination}",
    ]

    // MARK: - Scroll Keywords

    private static let scrollKeywords: [String: [(keyword: String, direction: String)]] = [
        "en": [("scroll down", "down"), ("scroll up", "up"), ("next", "down"), ("previous", "up")],
        "he": [
            ("גלול למטה", "down"), ("למטה", "down"), ("גלול למעלה", "up"),
            ("למעלה", "up"), ("עוד", "down"), ("הבא", "down"), ("הקודם", "up"),
        ],
        "es": [
            ("desplazar abajo", "down"), ("abajo", "down"),
            ("desplazar arriba", "up"), ("arriba", "up"),
        ],
    ]
    private static let scrollResponses: [String: [String: String]] = [
        "down": ["en": "Scrolling down", "he": "גולל למטה", "es": "Desplazando abajo"],
        "up": ["en": "Scrolling up", "he": "גולל למעלה", "es": "Desplazando arriba"],
    ]

    // MARK: - Control Keywords

    private static let controlKeywords: [String: [(keyword: String, command: String)]] = [
        "en": [
            ("volume up", "volume_up"), ("louder", "volume_up"),
            ("volume down", "volume_down"), ("quieter", "volume_down"),
            ("mute", "mute"), ("unmute", "unmute"),
            ("language", "language"), ("help", "help"),
        ],
        "he": [
            ("חזק", "volume_up"), ("שקט", "volume_down"),
            ("השתק", "mute"), ("שפה", "language"), ("עזרה", "help"),
        ],
        "es": [
            ("volumen alto", "volume_up"), ("volumen bajo", "volume_down"),
            ("silencio", "mute"), ("idioma", "language"), ("ayuda", "help"),
        ],
    ]
    private static let controlResponses: [String: [String: String]] = [
        "volume_up": ["en": "Volume up", "he": "מגביר", "es": "Subiendo volumen"],
        "volume_down": ["en": "Volume down", "he": "מנמיך", "es": "Bajando volumen"],
        "mute": ["en": "Muted", "he": "מושתק", "es": "Silenciado"],
        "unmute": ["en": "Unmuted", "he": "בוטל השתקה", "es": "Desilenciado"],
        "language": ["en": "Language settings", "he": "הגדרות שפה", "es": "Configuraci\u{00F3}n de idioma"],
        "help": ["en": "Opening help", "he": "פותח עזרה", "es": "Abriendo ayuda"],
    ]

    public init() {}

    // MARK: - Public API

    /// Classify transcript locally. Returns nil if server processing needed.
    public func classify(_ transcript: String, language: String) -> LocalIntentResult? {
        let lower = transcript.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !lower.isEmpty else { return nil }
        if let r = classifyPlaybackControl(lower, language: language) { return r }
        if let r = classifyNavigation(lower, language: language) { return r }
        if let r = classifyScroll(lower, language: language) { return r }
        return classifyControl(lower, language: language)
    }

    // MARK: - Classifiers

    private func classifyPlaybackControl(_ text: String, language: String) -> LocalIntentResult? {
        let lang = resolvedLanguage(language)
        guard let keywords = Self.playbackKeywords[lang] else { return nil }
        for entry in keywords.sorted(by: { $0.keyword.count > $1.keyword.count }) {
            guard text == entry.keyword || text.hasPrefix(entry.keyword + " ") else { continue }
            let response = Self.playbackResponses[entry.command]?[lang]
                ?? Self.playbackResponses[entry.command]?["en"] ?? ""
            return LocalIntentResult(
                intent: .playback, confidence: Self.localConfidence,
                action: VoiceAction(type: "playback_control", payload: ["command": AnyCodable(entry.command)]),
                spokenResponse: response
            )
        }
        return nil
    }

    private func classifyNavigation(_ text: String, language: String) -> LocalIntentResult? {
        let lang = resolvedLanguage(language)
        guard let keywords = Self.navigationKeywords[lang] else { return nil }
        for entry in keywords.sorted(by: { $0.keyword.count > $1.keyword.count }) {
            guard text.contains(entry.keyword) else { continue }
            let template = Self.navigationResponseTemplates[lang]
                ?? Self.navigationResponseTemplates["en"] ?? ""
            let response = template.replacingOccurrences(of: "{destination}", with: entry.destination)
            return LocalIntentResult(
                intent: .navigation, confidence: Self.localConfidence,
                action: VoiceAction(type: "navigate", payload: ["destination": AnyCodable(entry.destination)]),
                spokenResponse: response
            )
        }
        return nil
    }

    private func classifyScroll(_ text: String, language: String) -> LocalIntentResult? {
        let lang = resolvedLanguage(language)
        guard let keywords = Self.scrollKeywords[lang] else { return nil }
        for entry in keywords.sorted(by: { $0.keyword.count > $1.keyword.count }) {
            guard text.contains(entry.keyword) else { continue }
            let response = Self.scrollResponses[entry.direction]?[lang]
                ?? Self.scrollResponses[entry.direction]?["en"] ?? ""
            return LocalIntentResult(
                intent: .scroll, confidence: Self.localConfidence,
                action: VoiceAction(type: "scroll", payload: ["direction": AnyCodable(entry.direction)]),
                spokenResponse: response
            )
        }
        return nil
    }

    private func classifyControl(_ text: String, language: String) -> LocalIntentResult? {
        let lang = resolvedLanguage(language)
        guard let keywords = Self.controlKeywords[lang] else { return nil }
        for entry in keywords.sorted(by: { $0.keyword.count > $1.keyword.count }) {
            guard text.contains(entry.keyword) else { continue }
            let response = Self.controlResponses[entry.command]?[lang]
                ?? Self.controlResponses[entry.command]?["en"] ?? ""
            return LocalIntentResult(
                intent: .control, confidence: Self.localConfidence,
                action: VoiceAction(type: "control", payload: ["command": AnyCodable(entry.command)]),
                spokenResponse: response
            )
        }
        return nil
    }

    // MARK: - Helpers

    private func resolvedLanguage(_ language: String) -> String {
        let prefix = String(language.prefix(2))
        return Self.playbackKeywords.keys.contains(prefix) ? prefix : "en"
    }
}
