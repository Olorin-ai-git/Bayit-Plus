import BayitCore
import Foundation
import Observation

enum TVOnboardingStep: Int, CaseIterable, Sendable {
    case welcome = 0
    case aiLanguage
    case pauseAsk
    case interactive
    case neverMiss
    case zehAni
    case voiceSetup
    case complete
}

@MainActor
@Observable
final class TVOnboardingViewModel {
    var currentStep: TVOnboardingStep = .welcome
    var userName: String = ""
    private(set) var isSaving = false
    private(set) var error: String?

    private let userRepository: any UserRepository
    private let settingsRepository: any SettingsRepository
    private let profileId: String
    private let logger = BayitLogger(category: "TVOnboarding")

    private var completionKey: String {
        "tv.bayit.plus.onboarding.\(profileId).completed"
    }

    private var nameKey: String {
        "tv.bayit.plus.onboarding.\(profileId).userName"
    }

    var isComplete: Bool {
        UserDefaults.standard.bool(forKey: completionKey)
    }

    var totalSteps: Int {
        TVOnboardingStep.allCases.count
    }

    var stepProgress: Double {
        Double(currentStep.rawValue) / Double(totalSteps - 1)
    }

    init(
        profileId: String,
        userRepository: any UserRepository,
        settingsRepository: any SettingsRepository
    ) {
        self.profileId = profileId
        self.userRepository = userRepository
        self.settingsRepository = settingsRepository
    }

    func nextStep() {
        guard let nextIndex = TVOnboardingStep(rawValue: currentStep.rawValue + 1) else {
            return
        }
        withObservationTracking {
            currentStep = nextIndex
        } onChange: {}
        currentStep = nextIndex
    }

    func previousStep() {
        guard let prevIndex = TVOnboardingStep(rawValue: currentStep.rawValue - 1) else {
            return
        }
        currentStep = prevIndex
    }

    func savePreferences() async {
        isSaving = true
        error = nil

        do {
            let request = ProfileUpdateRequest(
                displayName: userName.isEmpty ? nil : userName,
                avatar: nil,
                language: nil,
                preferences: nil,
                phoneNumber: nil
            )
            _ = try await userRepository.updateProfile(request: request)
            markComplete()
            logger.info("Onboarding preferences saved for profile: \(profileId)")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to save onboarding preferences", error: error)
        }

        isSaving = false
    }

    func skipOnboarding() {
        markComplete()
        logger.info("Onboarding skipped for profile: \(profileId)")
    }

    // MARK: - Private

    private func markComplete() {
        let base = "tv.bayit.plus.onboarding.\(profileId)"
        UserDefaults.standard.set(true, forKey: completionKey)
        if !userName.isEmpty {
            UserDefaults.standard.set(userName, forKey: "\(base).userName")
        }
        logger.info("Persisted onboarding preferences for \(profileId)")
    }

    /// Read the persisted user name for a given profile.
    static func persistedUserName(profileId: String) -> String? {
        UserDefaults.standard.string(
            forKey: "tv.bayit.plus.onboarding.\(profileId).userName"
        )
    }
}
