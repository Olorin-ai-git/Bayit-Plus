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

        // Load each endpoint independently so one failure doesn't block the rest
        async let categoriesResult: Void = loadCategories()
        async let featuredResult: Void = loadFeatured()
        async let ageGroupsResult: Void = loadAgeGroups()

        _ = await (categoriesResult, featuredResult, ageGroupsResult)

        // Only show error if all sections are empty
        if categories.isEmpty && featured == nil && ageGroups.isEmpty {
            error = error ?? "Unable to load children content"
        }

        isLoading = false
    }

    private func loadCategories() async {
        do {
            let response = try await repository.fetchChildrenCategories()
            categories = response.categories ?? []
        } catch {
            // Individual failure is non-fatal
        }
    }

    private func loadFeatured() async {
        do {
            let response = try await repository.fetchChildrenFeatured()
            featured = response.featured
        } catch {
            // Individual failure is non-fatal
        }
    }

    private func loadAgeGroups() async {
        do {
            let response = try await repository.fetchAgeGroups()
            ageGroups = response.groups ?? []
        } catch {
            // Individual failure is non-fatal
        }
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
            let response = try await repository.fetchChildrenContent(
                category: selectedCategory,
                ageGroup: selectedAgeGroup,
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
