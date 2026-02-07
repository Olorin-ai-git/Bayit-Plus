import Foundation
import Observation

/// ViewModel for the Morning Ritual screen - manages daily ritual content and preferences.
@Observable
final class MorningRitualViewModel {
    private(set) var ritualCheck: RitualCheckResponse?
    private(set) var ritualContent: [RitualItem] = []
    private(set) var greeting: String?
    private(set) var aiBrief: RitualAIBriefResponse?
    private(set) var preferences: RitualPreferences?
    private(set) var isLoading = false
    private(set) var isSaving = false
    private(set) var error: String?

    private let repository: any CategoryRepository

    init(repository: any CategoryRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let checkResult = repository.checkRitual()
            async let contentResult = repository.fetchRitualContent()
            async let prefsResult = repository.fetchRitualPreferences()

            let checkResponse = try await checkResult
            let contentResponse = try await contentResult
            let prefsResponse = try await prefsResult

            ritualCheck = checkResponse
            ritualContent = contentResponse.items
            greeting = contentResponse.greeting
            preferences = prefsResponse
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadAIBrief() async {
        do {
            aiBrief = try await repository.fetchRitualAIBrief()
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func updatePreferences(
        enabled: Bool? = nil,
        time: String? = nil,
        includeNews: Bool? = nil,
        includePrayer: Bool? = nil,
        includeStudy: Bool? = nil,
        language: String? = nil
    ) async {
        isSaving = true
        error = nil

        do {
            let request = RitualPreferencesUpdate(
                enabled: enabled,
                time: time,
                includeNews: includeNews,
                includePrayer: includePrayer,
                includeStudy: includeStudy,
                language: language
            )
            preferences = try await repository.updateRitualPreferences(request: request)
        } catch {
            self.error = error.localizedDescription
        }

        isSaving = false
    }

    /// Whether the ritual is available and not yet completed today.
    var canStartRitual: Bool {
        guard let check = ritualCheck else { return false }
        return (check.isAvailable ?? false) && !(check.completedToday ?? false)
    }
}
