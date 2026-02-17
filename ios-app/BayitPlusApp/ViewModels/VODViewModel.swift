import Foundation
import Observation

enum VODFilterType: String, CaseIterable, Identifiable {
    case all
    case movies
    case series
    case collections

    var id: String { rawValue }

    var localizationKey: String {
        switch self {
        case .all: return "vod.allContent"
        case .movies: return "vod.movies"
        case .series: return "vod.series"
        case .collections: return "vod.collectionsOnly"
        }
    }
}

/// ViewModel for the VOD screen - manages movies/series grid with pagination
@MainActor
@Observable
final class VODViewModel {
    private(set) var items: [ContentItem] = []
    private(set) var allItems: [ContentItem] = []
    private(set) var categories: [ContentCategory] = []
    private(set) var isLoading = false
    private(set) var isLoadingMore = false
    private(set) var error: String?
    private(set) var currentPage = 1
    private(set) var hasMore = true

    var selectedType: VODFilterType = .all
    var selectedCategory: String? = nil
    var selectedGenre: String? = nil

    /// Unique genre names extracted from loaded content
    var availableGenres: [String] {
        let genreStrings = allItems.compactMap { $0.genre }
        let allGenres = genreStrings
            .flatMap { $0.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) } }
            .filter { !$0.isEmpty }
        return Array(Set(allGenres)).sorted()
    }

    private let repository: any ContentRepository
    private let pageSize = 20

    init(repository: any ContentRepository) {
        self.repository = repository
    }

    @MainActor
    func loadContent() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        currentPage = 1

        do {
            // Load categories and content in parallel
            async let categoriesTask: Void = loadCategoriesIfNeeded()

            if selectedType == .collections {
                let collections = try await repository.fetchCollections(
                    skip: 0,
                    limit: pageSize
                )
                await categoriesTask
                let mapped = collections.map { $0.toContentItem() }
                allItems = mapped
                items = mapped
                hasMore = collections.count >= pageSize
            } else {
                let response: ContentListResponse
                if selectedType == .series {
                    response = try await repository.fetchSeries(
                        page: currentPage,
                        limit: pageSize
                    )
                } else {
                    response = try await repository.fetchAllContent(
                        page: currentPage,
                        limit: pageSize
                    )
                }
                await categoriesTask
                allItems = response.items
                items = filterItems(response.items)
                hasMore = response.page < (response.total / pageSize + 1)
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    private func loadCategoriesIfNeeded() async {
        guard categories.isEmpty else { return }
        do {
            let response = try await repository.fetchCategories()
            categories = response.categories
        } catch {
            // Silently fail - categories are optional
        }
    }

    @MainActor
    func applyFilters() {
        items = filterItems(allItems)
    }

    @MainActor
    func loadMore() async {
        guard !isLoadingMore, hasMore else { return }
        isLoadingMore = true

        let nextPage = currentPage + 1

        do {
            if selectedType == .collections {
                let collections = try await repository.fetchCollections(
                    skip: items.count,
                    limit: pageSize
                )
                let mapped = collections.map { $0.toContentItem() }
                items.append(contentsOf: mapped)
                currentPage = nextPage
                hasMore = collections.count >= pageSize
            } else {
                let response: ContentListResponse
                if selectedType == .series {
                    response = try await repository.fetchSeries(
                        page: nextPage,
                        limit: pageSize
                    )
                } else {
                    response = try await repository.fetchAllContent(
                        page: nextPage,
                        limit: pageSize
                    )
                }
                let filteredItems = selectedType == .all
                    ? response.items
                    : filterItemsByType(response.items)
                items.append(contentsOf: filteredItems)
                currentPage = nextPage
                hasMore = response.page < (response.total / pageSize + 1)
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoadingMore = false
    }

    @MainActor
    func refresh() async {
        error = nil
        currentPage = 1
        isLoading = true

        do {
            if selectedType == .collections {
                let collections = try await repository.fetchCollections(
                    skip: 0,
                    limit: pageSize
                )
                let mapped = collections.map { $0.toContentItem() }
                items = mapped
                hasMore = collections.count >= pageSize
            } else {
                let response: ContentListResponse
                if selectedType == .series {
                    response = try await repository.fetchSeries(
                        page: 1,
                        limit: pageSize
                    )
                } else {
                    response = try await repository.fetchAllContent(
                        page: 1,
                        limit: pageSize
                    )
                }
                items = selectedType == .all
                    ? response.items
                    : filterItemsByType(response.items)
                hasMore = response.page < (response.total / pageSize + 1)
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    private func filterItems(_ items: [ContentItem]) -> [ContentItem] {
        var filtered = items

        // Filter by content type
        switch selectedType {
        case .all:
            break
        case .movies:
            filtered = filtered.filter { $0.type == "movie" }
        case .series:
            filtered = filtered.filter { $0.isSeries == true }
        case .collections:
            filtered = filtered.filter { $0.isCollectionParent == true }
        }

        // Filter by category - resolve name from ID since ContentItem.category
        // contains the category name, not the ID
        if let categoryId = selectedCategory,
           let categoryName = categories.first(where: { $0.id == categoryId })?.name {
            filtered = filtered.filter { $0.category == categoryName }
        }

        // Filter by genre
        if let genre = selectedGenre {
            filtered = filtered.filter { item in
                guard let itemGenre = item.genre else { return false }
                return itemGenre.localizedCaseInsensitiveContains(genre)
            }
        }

        return filtered
    }

    private func filterItemsByType(_ items: [ContentItem]) -> [ContentItem] {
        switch selectedType {
        case .all:
            return items
        case .movies:
            return items.filter { $0.type == "movie" }
        case .series:
            return items.filter { $0.isSeries == true }
        case .collections:
            return items.filter { $0.isCollectionParent == true }
        }
    }
}

