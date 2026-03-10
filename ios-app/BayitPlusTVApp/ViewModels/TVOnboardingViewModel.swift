import BayitCore
import BayitLocalization
import Foundation
import Observation

enum TVOnboardingStep: Int, CaseIterable, Sendable {
    case welcome = 0
    case aiLanguage
    case pauseAsk
    case interactive
    case neverMiss
    case zehAni
    case language
    case interests
    case culture
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

    // MARK: - Language Preferences

    var primaryLanguage: String = Language.english.rawValue
    var selectedLanguages: Set<String> = [
        Language.english.rawValue,
        Language.hebrew.rawValue,
    ]

    // MARK: - Content Interests

    var selectedInterests: Set<TVContentInterest> = []

    // MARK: - Culture

    var selectedCulture: String?

    private let userRepository: any UserRepository
    private let settingsRepository: any SettingsRepository
    private let profileId: String
    private let logger = BayitLogger(category: "TVOnboarding")

    private let minimumInterests = 3

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

    var canProceedFromInterests: Bool {
        selectedInterests.count >= minimumInterests
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

    // MARK: - Step Navigation

    func nextStep() {
        guard let nextIndex = TVOnboardingStep(
            rawValue: currentStep.rawValue + 1
        ) else { return }
        withObservationTracking {
            currentStep = nextIndex
        } onChange: {}
        currentStep = nextIndex
    }

    func previousStep() {
        guard let prevIndex = TVOnboardingStep(
            rawValue: currentStep.rawValue - 1
        ) else { return }
        currentStep = prevIndex
    }

    // MARK: - Interest Selection

    func toggleInterest(_ interest: TVContentInterest) {
        if selectedInterests.contains(interest) {
            selectedInterests.remove(interest)
        } else {
            selectedInterests.insert(interest)
        }
    }

    // MARK: - Language Selection

    func toggleLanguage(_ languageCode: String) {
        if selectedLanguages.contains(languageCode) {
            selectedLanguages.remove(languageCode)
        } else {
            selectedLanguages.insert(languageCode)
        }
    }

    // MARK: - Save

    func savePreferences() async {
        isSaving = true
        error = nil

        do {
            let preferences = ProfilePreferencesUpdate(
                language: primaryLanguage,
                subtitleLanguage: nil,
                autoplay: nil,
                notifications: nil,
                contentRating: nil,
                quality: nil
            )
            let request = ProfileUpdateRequest(
                displayName: userName.isEmpty ? nil : userName,
                avatar: nil,
                language: primaryLanguage,
                preferences: preferences,
                phoneNumber: nil
            )
            _ = try await userRepository.updateProfile(request: request)
            markComplete()
            logger.info(
                "Onboarding preferences saved for profile: \(profileId)"
            )
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error(
                "Failed to save onboarding preferences", error: error
            )
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
            UserDefaults.standard.set(
                userName, forKey: "\(base).userName"
            )
        }
        if !selectedInterests.isEmpty {
            let interests = selectedInterests.map(\.rawValue)
            UserDefaults.standard.set(
                interests, forKey: "\(base).interests"
            )
        }
        if !selectedLanguages.isEmpty {
            let languages = Array(selectedLanguages)
            UserDefaults.standard.set(
                languages, forKey: "\(base).contentLanguages"
            )
        }
        UserDefaults.standard.set(
            primaryLanguage, forKey: "\(base).primaryLanguage"
        )
        if let culture = selectedCulture {
            UserDefaults.standard.set(
                culture, forKey: "\(base).culture"
            )
        }
        logger.info(
            "Persisted onboarding preferences for \(profileId)"
        )
    }

    /// Read the persisted user name for a given profile.
    static func persistedUserName(profileId: String) -> String? {
        UserDefaults.standard.string(
            forKey: "tv.bayit.plus.onboarding.\(profileId).userName"
        )
    }
}
