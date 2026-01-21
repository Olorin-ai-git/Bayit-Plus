import Foundation

/// User preferences for translation and text-to-speech
struct TranslationSettings: Codable {
    /// Supported translation languages
    enum Language: String, CaseIterable, Codable {
        case spanish = "Spanish"
        case french = "French"
        case german = "German"
        case japanese = "Japanese"
        case mandarin = "Mandarin Chinese"

        /// ISO 639-1 language code
        var code: String {
            switch self {
            case .spanish: return "es"
            case .french: return "fr"
            case .german: return "de"
            case .japanese: return "ja"
            case .mandarin: return "zh"
            }
        }

        /// Full language name for display
        var displayName: String {
            self.rawValue
        }
    }

    /// ElevenLabs TTS voice options
    enum TTSVoice: String, CaseIterable, Codable {
        case rachel = "Rachel"
        case adam = "Adam"
        case bella = "Bella"
        case arnold = "Arnold"

        /// ElevenLabs voice ID
        var voiceID: String {
            switch self {
            case .rachel: return "21m00Tcm4TlvDq8ikWAM"
            case .adam: return "pNInz6obpgDQGcFmaJgB"
            case .bella: return "EXAVITQu4vr4xnSDxMaL"
            case .arnold: return "VR6AewLTigWG4xSOukaG"
            }
        }

        /// Voice display name
        var displayName: String {
            self.rawValue
        }
    }

    /// Selected target language for translation
    var targetLanguage: Language

    /// Whether text-to-speech is enabled
    var enableTTS: Bool

    /// Selected TTS voice
    var ttsVoice: TTSVoice

    /// Default initializer
    init(
        targetLanguage: Language = .spanish,
        enableTTS: Bool = false,
        ttsVoice: TTSVoice = .rachel
    ) {
        self.targetLanguage = targetLanguage
        self.enableTTS = enableTTS
        self.ttsVoice = ttsVoice
    }

    /// UserDefaults key for persistence
    private static let userDefaultsKey = "omenTranslationSettings"

    /// Load settings from UserDefaults
    static func load() -> TranslationSettings {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey),
              let settings = try? JSONDecoder().decode(TranslationSettings.self, from: data) else {
            return TranslationSettings()
        }
        return settings
    }

    /// Save settings to UserDefaults
    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: Self.userDefaultsKey)
        }
    }
}
