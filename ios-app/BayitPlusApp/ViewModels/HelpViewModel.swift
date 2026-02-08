import Foundation
import Observation

/// ViewModel for the Help Center screen - manages FAQ fetching and display
@Observable
final class HelpViewModel {
    private(set) var faqs: [FAQItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any SettingsRepository
    private let language: String

    init(repository: any SettingsRepository, language: String) {
        self.repository = repository
        self.language = language
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchFAQ(language: language)
            faqs = response.items
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func refresh() async {
        await load()
    }
}
