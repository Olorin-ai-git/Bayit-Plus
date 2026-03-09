import BayitAnalytics
import BayitLocalization
import Foundation
import Observation

@MainActor
@Observable
final class OnboardingFlowViewModel {
    enum Step: Int, CaseIterable {
        case welcome
        case aiLanguage
        case pauseAsk
        case interactive
        case neverMiss
        case zehAni
        case voiceSetup
        case launch
    }

    private(set) var currentStep: Step = .welcome
    private(set) var isComplete = false

    var selectedLanguage: Language = .english
    var voiceEnabled = false
    var wakeWordEnabled = false

    private let analytics: AnalyticsService
    private static let completedKey = "bayit.plus.onboarding.completed"

    static var hasCompletedOnboarding: Bool {
        #if DEBUG
            return false
        #else
            return UserDefaults.standard.bool(forKey: completedKey)
        #endif
    }

    init(
        analytics: AnalyticsService = AnalyticsService(),
        initialLanguage: Language = .english
    ) {
        self.analytics = analytics
        selectedLanguage = initialLanguage
    }

    var currentStepIndex: Int {
        currentStep.rawValue
    }

    var totalSteps: Int {
        Step.allCases.count
    }

    var isFeatureCard: Bool {
        switch currentStep {
        case .aiLanguage, .pauseAsk, .interactive, .neverMiss, .zehAni:
            return true
        default:
            return false
        }
    }

    func nextStep() {
        guard let idx = Step.allCases.firstIndex(of: currentStep),
              Step.allCases.index(after: idx) < Step.allCases.endIndex
        else { return }
        let next = Step.allCases[Step.allCases.index(after: idx)]
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingCardView,
            parameters: ["step": next.analyticsName]
        )
        currentStep = next
    }

    func previousStep() {
        guard let idx = Step.allCases.firstIndex(of: currentStep),
              idx > Step.allCases.startIndex
        else { return }
        currentStep = Step.allCases[Step.allCases.index(before: idx)]
    }

    func skip() {
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingTourSkip,
            parameters: ["last_step": currentStep.analyticsName]
        )
        markCompleted()
    }

    func completeOnboarding() {
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingTourComplete,
            parameters: [
                "voice_enabled": String(voiceEnabled),
                "language": selectedLanguage.rawValue,
            ]
        )
        markCompleted()
    }

    private func markCompleted() {
        isComplete = true
        UserDefaults.standard.set(true, forKey: Self.completedKey)
    }
}

extension OnboardingFlowViewModel.Step {
    var analyticsName: String {
        switch self {
        case .welcome: return "welcome"
        case .aiLanguage: return "ai_language"
        case .pauseAsk: return "pause_ask"
        case .interactive: return "interactive"
        case .neverMiss: return "never_miss"
        case .zehAni: return "zeh_ani"
        case .voiceSetup: return "voice_setup"
        case .launch: return "launch"
        }
    }

    var featureImageName: String? {
        switch self {
        case .aiLanguage: return "onboarding_ai_language"
        case .pauseAsk: return "onboarding_pause_ask"
        case .interactive: return "onboarding_interactive"
        case .neverMiss: return "onboarding_catchup_byoc"
        case .zehAni: return "onboarding_zeh_ani"
        default: return nil
        }
    }
}
