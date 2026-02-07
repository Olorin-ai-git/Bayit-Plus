import Foundation
import Observation

/// ViewModel for the Home screen - manages featured content, categories, and spotlight
@Observable
final class HomeViewModel {
    private(set) var hero: HeroContent?
    private(set) var spotlight: [SpotlightItem] = []
    private(set) var categories: [ContentCategory] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any ContentRepository

    init(repository: any ContentRepository) {
        self.repository = repository
    }

    @MainActor
    func loadFeatured() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchFeatured()
            hero = response.hero
            spotlight = response.spotlight
            categories = response.categories
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func refresh() async {
        error = nil
        isLoading = true

        do {
            let response = try await repository.fetchFeatured()
            hero = response.hero
            spotlight = response.spotlight
            categories = response.categories
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
