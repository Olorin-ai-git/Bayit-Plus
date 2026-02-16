import Foundation
import Observation

/// ViewModel for the Youngsters content screen - manages teen-oriented content.
@MainActor
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

        async let catTask: Void = loadCategories()
        async let featTask: Void = loadFeatured()
        async let trendTask: Void = loadTrending()
        async let newsTask: Void = loadNews()

        _ = await (catTask, featTask, trendTask, newsTask)

        if categories.isEmpty && featured == nil && trending.isEmpty && news.isEmpty {
            error = error ?? "Unable to load youngsters content"
        }

        isLoading = false
    }

    private func loadCategories() async {
        do {
            let response = try await repository.fetchYoungsterCategories()
            categories = response.categories ?? []
        } catch { }
    }

    private func loadFeatured() async {
        do {
            let response = try await repository.fetchYoungstersFeatured()
            featured = response.featured
        } catch { }
    }

    private func loadTrending() async {
        do {
            let response = try await repository.fetchYoungstersTrending()
            trending = response.items
        } catch { }
    }

    private func loadNews() async {
        do {
            let response = try await repository.fetchYoungstersNews()
            news = response.items
        } catch { }
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
            if let message = error.userFriendlyMessage {
                self.error = message
            }
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
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }
}
