import Foundation
import Observation

/// ViewModel for AI-powered onboarding flow - manages multi-step
/// preferences collection including language, content taste, voice setup, and profile.
@MainActor
@Observable
final class OnboardingAIViewModel {
    enum Step: Int, CaseIterable {
        case welcome
        case contentTaste
        case voiceSetup
        case profileCreation
    }

    // MARK: - State

    private(set) var currentStep: Step = .welcome
    private(set) var isComplete = false

    // Step 1: Welcome / Preferences
    var preferredLanguage = "en"
    var subtitlesEnabled = true
    var autoplayEnabled = true

    // Step 2: Content Taste
    var selectedGenres: Set<String> = []
    var likedContentIds: Set<String> = []
    var dislikedContentIds: Set<String> = []

    // Step 3: Voice Setup
    var voiceEnabled = false
    var wakeWordEnabled = false

    // Step 4: Profile
    var displayName = ""
    var selectedAvatar: String?

    private let userRepository: any UserRepository

    private static let completedKey = "bayit.plus.onboarding.ai.completed"

    /// Whether the user has previously completed onboarding.
    static var hasCompletedOnboarding: Bool {
        UserDefaults.standard.bool(forKey: completedKey)
    }

    init(userRepository: any UserRepository) {
        self.userRepository = userRepository
    }

    // MARK: - Navigation

    var totalSteps: Int {
        Step.allCases.count
    }

    var currentStepIndex: Int {
        currentStep.rawValue
    }

    var progress: Double {
        guard totalSteps > 0 else { return 0 }
        return Double(currentStep.rawValue + 1) / Double(totalSteps)
    }

    var canProceed: Bool {
        switch currentStep {
        case .welcome:
            return true
        case .contentTaste:
            return !selectedGenres.isEmpty
        case .voiceSetup:
            return true
        case .profileCreation:
            return !displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    func nextStep() {
        guard let nextIndex = Step.allCases.firstIndex(of: currentStep)
            .map({ Step.allCases.index(after: $0) }),
            nextIndex < Step.allCases.endIndex
        else {
            return
        }
        currentStep = Step.allCases[nextIndex]
    }

    func previousStep() {
        guard let prevIndex = Step.allCases.firstIndex(of: currentStep)
            .flatMap({ $0 > Step.allCases.startIndex ? Step.allCases.index(before: $0) : nil })
        else { return }
        currentStep = Step.allCases[prevIndex]
    }

    // MARK: - Content Taste Helpers

    func toggleGenre(_ genre: String) {
        if selectedGenres.contains(genre) {
            selectedGenres.remove(genre)
        } else {
            selectedGenres.insert(genre)
        }
    }

    func likeContent(_ contentId: String) {
        dislikedContentIds.remove(contentId)
        likedContentIds.insert(contentId)
    }

    func dislikeContent(_ contentId: String) {
        likedContentIds.remove(contentId)
        dislikedContentIds.insert(contentId)
    }

    func skipOnboarding() {
        markCompleted()
    }

    private func markCompleted() {
        isComplete = true
        UserDefaults.standard.set(true, forKey: Self.completedKey)
    }

    // MARK: - Completion

    @MainActor
    func completeOnboarding() async {
        let trimmedName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        let preferences = ProfilePreferencesUpdate(
            language: preferredLanguage,
            subtitleLanguage: nil,
            autoplay: autoplayEnabled,
            notifications: nil,
            contentRating: nil,
            quality: nil
        )

        do {
            _ = try await userRepository.updateProfile(
                request: ProfileUpdateRequest(
                    displayName: trimmedName,
                    avatar: selectedAvatar,
                    language: preferredLanguage,
                    preferences: preferences,
                    phoneNumber: nil
                )
            )
            markCompleted()
        } catch {
            // Onboarding completes even if profile save fails;
            // user can update profile later from settings.
            markCompleted()
        }
    }
}
