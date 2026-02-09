#if os(iOS)
import BayitVoice
import Foundation
import Observation

/// ViewModel for the voice onboarding flow.
/// Guides users through permission requests and language selection.
/// Available on iOS only -- tvOS does not support microphone input.
@Observable
final class VoiceOnboardingViewModel {

    // MARK: - State

    enum Step: Int, CaseIterable {
        case welcome
        case permissions
        case languageSelect
        case complete
    }

    private(set) var currentStep: Step = .welcome
    private(set) var permissions = VoicePermissions(microphone: false, speechRecognition: false)
    private(set) var isRequestingPermissions = false
    private(set) var availableLanguages = SupportedLanguage.allCases
    var selectedLanguage: SupportedLanguage = .english

    private let speechService: SpeechRecognitionService

    // MARK: - Init

    init(speechService: SpeechRecognitionService) {
        self.speechService = speechService
        permissions = speechService.checkPermissions()
    }

    // MARK: - Navigation

    func advance() {
        guard let nextIndex = Step.allCases.firstIndex(of: currentStep)
            .map({ Step.allCases.index(after: $0) }),
              nextIndex < Step.allCases.endIndex else {
            return
        }
        currentStep = Step.allCases[nextIndex]
    }

    func skip() {
        currentStep = .complete
    }

    // MARK: - Permissions

    func requestPermissions() async {
        isRequestingPermissions = true
        permissions = await speechService.requestPermissions()
        isRequestingPermissions = false

        if permissions.allGranted {
            advance()
        }
    }

    // MARK: - Progress

    var progress: Double {
        let total = Double(Step.allCases.count)
        let current = Double(currentStep.rawValue + 1)
        return current / total
    }

    var isComplete: Bool { currentStep == .complete }
}
#endif

// MARK: - Supported Languages

enum SupportedLanguage: String, CaseIterable, Identifiable {
    case english = "en"
    case hebrew = "he"
    case spanish = "es"
    case french = "fr"
    case chinese = "zh"
    case italian = "it"
    case japanese = "ja"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .english: return "English"
        case .hebrew: return "Hebrew"
        case .spanish: return "Spanish"
        case .french: return "French"
        case .chinese: return "Chinese"
        case .italian: return "Italian"
        case .japanese: return "Japanese"
        }
    }

    var nativeName: String {
        switch self {
        case .english: return "English"
        case .hebrew: return "Hebrew"
        case .spanish: return "Espanol"
        case .french: return "Francais"
        case .chinese: return "Chinese"
        case .italian: return "Italiano"
        case .japanese: return "Japanese"
        }
    }
}
