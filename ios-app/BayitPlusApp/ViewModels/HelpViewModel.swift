import Foundation
import Observation

/// ViewModel for the Help Center screen - manages FAQ fetching and display
@MainActor
@Observable
final class HelpViewModel {
    private(set) var faqs: [FAQItem] = []
    private(set) var tutorials: [VideoTutorial] = []
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
            async let faqLoad = repository.fetchFAQ(language: language)
            async let tutorialsLoad = repository.fetchTutorials(language: language)
            let (faqResponse, tutorialsResponse) = try await (faqLoad, tutorialsLoad)
            faqs = faqResponse.items
            tutorials = tutorialsResponse.items.sorted { $0.order < $1.order }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func refresh() async {
        await load()
    }
}
