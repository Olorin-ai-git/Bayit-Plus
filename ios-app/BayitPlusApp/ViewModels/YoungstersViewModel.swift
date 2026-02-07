import Foundation
import Observation

/// ViewModel for the Youngsters content screen - manages teen-oriented content.
@Observable
final class YoungstersViewModel {
    private(set) var categories: [SectionCategory] = []
    private(set) var featured: SectionFeatured?
    private(set) var items: [SectionContentItem] = []
    private(set) var trending: [SectionContentItem] = []
    private(set) var news: [NewsItem] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var selectedCategory: String?
    private(set) var total: Int = 0
    private(set) var currentPage = 1

    private let repository: any CategoryRepository
    private let pageSize = 20

    init(repository: any CategoryRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let categoriesResult = repository.fetchYoungsterCategories()
            async let featuredResult = repository.fetchYoungstersFeatured()
            async let trendingResult = repository.fetchYoungstersTrending()
            async let newsResult = repository.fetchYoungstersNews()

            let catResponse = try await categoriesResult
            let featResponse = try await featuredResult
            let trendResponse = try await trendingResult
            let newsResponse = try await newsResult

            categories = catResponse.categories
            featured = featResponse.featured
            trending = trendResponse.items
            news = newsResponse.items
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadContent(category: String? = nil) async {
        isLoading = true
        error = nil
        selectedCategory = category
        currentPage = 1

        do {
            let response = try await repository.fetchYoungsterContent(
                category: category,
                page: currentPage,
                limit: pageSize
            )
            items = response.items
            total = response.total ?? response.items.count
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadMore() async {
        guard !isLoading, items.count < total else { return }
        isLoading = true

        do {
            let nextPage = currentPage + 1
            let response = try await repository.fetchYoungsterContent(
                category: selectedCategory,
                page: nextPage,
                limit: pageSize
            )
            items.append(contentsOf: response.items)
            currentPage = nextPage
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
