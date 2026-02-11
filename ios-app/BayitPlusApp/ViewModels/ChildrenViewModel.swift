import Foundation
import Observation

/// ViewModel for the Children content screen - manages age-restricted kids content.
@MainActor
@Observable
final class ChildrenViewModel {
    private(set) var categories: [SectionCategory] = []
    private(set) var featured: SectionFeatured?
    private(set) var items: [SectionContentItem] = []
    private(set) var ageGroups: [AgeGroup] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var selectedCategory: String?
    private(set) var selectedAgeGroup: String?
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
            async let categoriesResult = repository.fetchChildrenCategories()
            async let featuredResult = repository.fetchChildrenFeatured()
            async let ageGroupsResult = repository.fetchAgeGroups()

            let catResponse = try await categoriesResult
            let featResponse = try await featuredResult
            let ageResponse = try await ageGroupsResult

            categories = catResponse.categories
            featured = featResponse.featured
            ageGroups = ageResponse.groups
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadContent(category: String? = nil, ageGroup: String? = nil) async {
        isLoading = true
        error = nil
        selectedCategory = category
        selectedAgeGroup = ageGroup
        currentPage = 1

        do {
            let response = try await repository.fetchChildrenContent(
                category: category,
                ageGroup: ageGroup,
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
            let response = try await repository.fetchChildrenContent(
                category: selectedCategory,
                ageGroup: selectedAgeGroup,
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
