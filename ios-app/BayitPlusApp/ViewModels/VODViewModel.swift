import Foundation
import Observation

enum VODFilterType: String, CaseIterable, Identifiable {
    case all
    case movies
    case series
    case collections

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .all: return "All Content"
        case .movies: return "Movies"
        case .series: return "Series"
        case .collections: return "Collections"
        }
    }
}

/// ViewModel for the VOD screen - manages movies/series grid with pagination
@MainActor
@Observable
final class VODViewModel {
    private(set) var items: [ContentItem] = []
    private(set) var isLoading = false
    private(set) var isLoadingMore = false
    private(set) var error: String?
    private(set) var currentPage = 1
    private(set) var hasMore = true

    var selectedType: VODFilterType = .all

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
            let response: ContentListResponse
            if selectedType == .collections {
                response = try await repository.fetchCollections(
                    page: currentPage,
                    limit: pageSize
                )
            } else {
                response = try await repository.fetchAllContent(
                    page: currentPage,
                    limit: pageSize
                )
            }

            if selectedType == .all {
                items = response.items
            } else {
                items = filterItemsByType(response.items)
            }

            hasMore = response.page < (response.total / pageSize + 1)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadMore() async {
        guard !isLoadingMore, hasMore else { return }
        isLoadingMore = true

        let nextPage = currentPage + 1

        do {
            let response: ContentListResponse
            if selectedType == .collections {
                response = try await repository.fetchCollections(
                    page: nextPage,
                    limit: pageSize
                )
            } else {
                response = try await repository.fetchAllContent(
                    page: nextPage,
                    limit: pageSize
                )
            }

            let filteredItems = selectedType == .all ? response.items : filterItemsByType(response.items)
            items.append(contentsOf: filteredItems)
            currentPage = nextPage
            hasMore = response.page < (response.total / pageSize + 1)
        } catch {
            self.error = error.localizedDescription
        }

        isLoadingMore = false
    }

    @MainActor
    func refresh() async {
        error = nil
        currentPage = 1
        isLoading = true

        do {
            let response: ContentListResponse
            if selectedType == .collections {
                response = try await repository.fetchCollections(
                    page: 1,
                    limit: pageSize
                )
            } else {
                response = try await repository.fetchAllContent(
                    page: 1,
                    limit: pageSize
                )
            }

            items = selectedType == .all ? response.items : filterItemsByType(response.items)
            hasMore = response.page < (response.total / pageSize + 1)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
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
