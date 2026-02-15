import Foundation
import Observation

/// ViewModel for the Judaism content screen - manages religious content and calendar.
@MainActor
@Observable
final class JudaismViewModel {
    private(set) var categories: [SectionCategory] = []
    private(set) var items: [SectionContentItem] = []
    private(set) var calendarEvents: [CalendarEvent] = []
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
            async let categoriesResult = repository.fetchJudaismCategories()
            async let calendarResult = repository.fetchJudaismCalendar()
            async let newsResult = repository.fetchJudaismNews()

            let catResponse = try await categoriesResult
            let calResponse = try await calendarResult
            let newsResponse = try await newsResult

            categories = catResponse.categories ?? []
            calendarEvents = calResponse.events
            news = newsResponse.items
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
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
            let response = try await repository.fetchJudaismContent(
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
            let response = try await repository.fetchJudaismContent(
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
