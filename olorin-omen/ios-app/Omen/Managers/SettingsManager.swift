import Foundation
import Combine

/// Manages user settings and preferences
class SettingsManager: ObservableObject {
    // MARK: - Published Settings
    @Published var targetLanguage: TranslationLanguage
    @Published var selectedVoice: TTSVoice
    @Published var isTTSEnabled: Bool
    @Published var autoStartOnActionButton: Bool
    @Published var vibrateOnTranslation: Bool

    // MARK: - User Defaults Keys
    private enum Keys {
        static let targetLanguage = "targetLanguage"
        static let selectedVoice = "selectedVoice"
        static let isTTSEnabled = "isTTSEnabled"
        static let autoStartOnActionButton = "autoStartOnActionButton"
        static let vibrateOnTranslation = "vibrateOnTranslation"
    }

    // MARK: - Cancellables
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init() {
        // Load saved preferences or use defaults
        let languageCode = UserDefaults.standard.string(forKey: Keys.targetLanguage) ?? "es"
        self.targetLanguage = TranslationLanguage(rawValue: languageCode) ?? .spanish

        let voiceId = UserDefaults.standard.string(forKey: Keys.selectedVoice) ?? "rachel"
        self.selectedVoice = TTSVoice(rawValue: voiceId) ?? .rachel

        self.isTTSEnabled = UserDefaults.standard.object(forKey: Keys.isTTSEnabled) as? Bool ?? true
        self.autoStartOnActionButton = UserDefaults.standard.object(forKey: Keys.autoStartOnActionButton) as? Bool ?? true
        self.vibrateOnTranslation = UserDefaults.standard.object(forKey: Keys.vibrateOnTranslation) as? Bool ?? false

        // Auto-save on changes
        setupAutoSave()
    }

    // MARK: - Auto-Save
    private func setupAutoSave() {
        $targetLanguage
            .dropFirst()
            .sink { [weak self] language in
                UserDefaults.standard.set(language.rawValue, forKey: Keys.targetLanguage)
            }
            .store(in: &cancellables)

        $selectedVoice
            .dropFirst()
            .sink { [weak self] voice in
                UserDefaults.standard.set(voice.rawValue, forKey: Keys.selectedVoice)
            }
            .store(in: &cancellables)

        $isTTSEnabled
            .dropFirst()
            .sink { [weak self] enabled in
                UserDefaults.standard.set(enabled, forKey: Keys.isTTSEnabled)
            }
            .store(in: &cancellables)

        $autoStartOnActionButton
            .dropFirst()
            .sink { [weak self] enabled in
                UserDefaults.standard.set(enabled, forKey: Keys.autoStartOnActionButton)
            }
            .store(in: &cancellables)

        $vibrateOnTranslation
            .dropFirst()
            .sink { [weak self] enabled in
                UserDefaults.standard.set(enabled, forKey: Keys.vibrateOnTranslation)
            }
            .store(in: &cancellables)
    }

    // MARK: - Reset
    func resetToDefaults() {
        targetLanguage = .spanish
        selectedVoice = .rachel
        isTTSEnabled = true
        autoStartOnActionButton = true
        vibrateOnTranslation = false
    }
}

// MARK: - Translation Language
enum TranslationLanguage: String, CaseIterable, Identifiable {
    case spanish = "es"
    case french = "fr"
    case german = "de"
    case japanese = "ja"
    case mandarin = "zh"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .spanish: return "Spanish"
        case .french: return "French"
        case .german: return "German"
        case .japanese: return "Japanese"
        case .mandarin: return "Mandarin Chinese"
        }
    }

    var flag: String {
        switch self {
        case .spanish: return "🇪🇸"
        case .french: return "🇫🇷"
        case .german: return "🇩🇪"
        case .japanese: return "🇯🇵"
        case .mandarin: return "🇨🇳"
        }
    }
}

// MARK: - TTS Voice
enum TTSVoice: String, CaseIterable, Identifiable {
    case rachel = "rachel"
    case adam = "adam"
    case bella = "bella"
    case arnold = "arnold"

    var id: String { rawValue }

    var displayName: String {
        rawValue.capitalized
    }

    var voiceId: String {
        switch self {
        case .rachel: return "21m00Tcm4TlvDq8ikWAM"
        case .adam: return "pNInz6obpgDQGcFmaJgB"
        case .bella: return "EXAVITQu4vr4xnSDxMaL"
        case .arnold: return "VR6AewLTigWG4xSOukaG"
        }
    }

    var description: String {
        switch self {
        case .rachel: return "Natural, clear female voice"
        case .adam: return "Professional male voice"
        case .bella: return "Warm female voice"
        case .arnold: return "Deep male voice"
        }
    }
}
