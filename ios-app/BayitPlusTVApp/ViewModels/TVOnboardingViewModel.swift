import BayitCore
import Foundation
import Observation

enum TVOnboardingStep: Int, CaseIterable, Sendable {
    case welcome = 0
    case language
    case culture
    case interests
    case byoc
    case voiceName
    case complete
}

enum TVContentInterest: String, CaseIterable, Identifiable, Sendable {
    case movies
    case series
    case liveTV
    case podcasts
    case audiobooks
    case radio
    case kidsContent
    case music
    case news
    case sports

    var id: String {
        rawValue
    }

    var iconName: String {
        switch self {
        case .movies: return "film"
        case .series: return "tv"
        case .liveTV: return "play.tv"
        case .podcasts: return "headphones"
        case .audiobooks: return "book.fill"
        case .radio: return "radio"
        case .kidsContent: return "figure.and.child.holdinghands"
        case .music: return "music.note"
        case .news: return "newspaper"
        case .sports: return "sportscourt"
        }
    }

    var localizationKey: String {
        "onboarding.interest.\(rawValue)"
    }
}

@MainActor
@Observable
final class TVOnboardingViewModel {
    var currentStep: TVOnboardingStep = .welcome
    var selectedLanguages: Set<String> = []
    var primaryLanguage: String = "en"
    var selectedCulture: String?
    var selectedInterests: Set<TVContentInterest> = []
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

    var canProceedFromInterests: Bool {
        let minimumSelections = 3
        return selectedInterests.count >= minimumSelections
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
            let prefsUpdate = ProfilePreferencesUpdate(
                language: primaryLanguage,
                subtitleLanguage: selectedLanguages.first,
                autoplay: true,
                notifications: true,
                contentRating: nil,
                quality: nil
            )
            let request = ProfileUpdateRequest(
                displayName: userName.isEmpty ? nil : userName,
                avatar: nil,
                language: primaryLanguage,
                preferences: prefsUpdate,
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

    func toggleInterest(_ interest: TVContentInterest) {
        if selectedInterests.contains(interest) {
            selectedInterests.remove(interest)
        } else {
            selectedInterests.insert(interest)
        }
    }

    func toggleLanguage(_ languageCode: String) {
        if selectedLanguages.contains(languageCode) {
            selectedLanguages.remove(languageCode)
        } else {
            selectedLanguages.insert(languageCode)
        }
    }

    // MARK: - Private

    private func markComplete() {
        let base = "tv.bayit.plus.onboarding.\(profileId)"
        UserDefaults.standard.set(true, forKey: completionKey)
        if !userName.isEmpty {
            UserDefaults.standard.set(userName, forKey: "\(base).userName")
        }
        if let culture = selectedCulture {
            UserDefaults.standard.set(culture, forKey: "\(base).culture")
        }
        let interestStrings = selectedInterests.map(\.rawValue)
        UserDefaults.standard.set(interestStrings, forKey: "\(base).interests")
        let langArray = Array(selectedLanguages)
        UserDefaults.standard.set(langArray, forKey: "\(base).contentLanguages")
        UserDefaults.standard.set(primaryLanguage, forKey: "\(base).primaryLanguage")
        logger.info("Persisted all onboarding preferences for \(profileId)")
    }

    /// Read the persisted user name for a given profile.
    static func persistedUserName(profileId: String) -> String? {
        UserDefaults.standard.string(
            forKey: "tv.bayit.plus.onboarding.\(profileId).userName"
        )
    }
}
