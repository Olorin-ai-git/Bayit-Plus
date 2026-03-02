import Foundation
import Observation

enum VODFilterType: String, CaseIterable, Identifiable {
    case all
    case movies
    case series
    case collections
    case actors

    var id: String {
        rawValue
    }

    var localizationKey: String {
        switch self {
        case .all: return "vod.allContent"
        case .movies: return "vod.movies"
        case .series: return "vod.series"
        case .collections: return "vod.collectionsOnly"
        case .actors: return "vod.actors"
        }
    }
}

/// ViewModel for the VOD screen - manages movies/series grid with pagination
@MainActor
@Observable
final class VODViewModel {
    var items: [ContentItem] = []
    var allItems: [ContentItem] = []
    var categories: [ContentCategory] = []
    var isLoading = false
    var isLoadingMore = false
    var error: String?
    var currentPage = 1
    var hasMore = true

    var selectedType: VODFilterType = .all
    var selectedCategory: String?
    var selectedGenre: String?

    /// Unique genre names extracted from loaded content
    var availableGenres: [String] {
        let genreStrings = allItems.compactMap { $0.genre }
        let allGenres = genreStrings
            .flatMap { $0.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) } }
            .filter { !$0.isEmpty }
        return Array(Set(allGenres)).sorted()
    }

    let repository: any ContentRepository
    let actorRepository: any ActorRepository
    let pageSize = 20

    init(repository: any ContentRepository, actorRepository: any ActorRepository) {
        self.repository = repository
        self.actorRepository = actorRepository
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

            if selectedType == .actors {
                let actors = try await actorRepository.fetchActors(
                    skip: 0,
                    limit: pageSize
                )
                await categoriesTask
                let mapped = actors.map { $0.toContentItem() }
                allItems = mapped
                items = mapped
                hasMore = actors.count >= pageSize
            } else if selectedType == .collections {
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
}
