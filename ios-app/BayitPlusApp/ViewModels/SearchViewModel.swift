import BayitCore
import Foundation
import Observation

/// ViewModel for the Search screen with unified search, filter pills,
/// trending searches, and recent search history.
@Observable
final class SearchViewModel {
    var query = ""
    var selectedFilter: SearchContentTypeFilter = .all
    private(set) var results: [UnifiedSearchResult] = []
    private(set) var totalResults = 0
    private(set) var isSearching = false
    private(set) var error: String?
    private(set) var hasSearched = false
    private(set) var trendingSearches: [String] = []
    private(set) var recentSearches: [String] = []

    private let searchRepository: any SearchRepository
    private let recentSearchesService: RecentSearchesService
    private let logger = BayitLogger(category: "SearchViewModel")
    private var searchTask: Task<Void, Never>?
    private let debounceInterval: Duration = .milliseconds(300)

    init(
        searchRepository: any SearchRepository,
        recentSearchesService: RecentSearchesService = RecentSearchesService()
    ) {
        self.searchRepository = searchRepository
        self.recentSearchesService = recentSearchesService
    }

    /// Load trending searches from API and recent from UserDefaults on view appear.
    @MainActor
    func loadInitialData() async {
        recentSearches = recentSearchesService.load()

        do {
            trendingSearches = try await searchRepository.fetchTrendingSearches(limit: 10)
        } catch {
            logger.error("Failed to load trending searches", error: error)
        }
    }

    /// Debounced handler for query text changes.
    /// Empty query triggers browse-all; non-empty triggers debounced search.
    @MainActor
    func onQueryChanged() {
        searchTask?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty {
            results = []
            totalResults = 0
            hasSearched = false
            return
        }

        searchTask = Task {
            try? await Task.sleep(for: debounceInterval)
            guard !Task.isCancelled else { return }
            await performSearch()
        }
    }

    /// Handler for filter pill selection changes.
    @MainActor
    func onFilterChanged(_ filter: SearchContentTypeFilter) {
        guard filter != selectedFilter else { return }
        selectedFilter = filter
        searchTask?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        searchTask = Task {
            await performSearch()
        }
    }

    /// Select a trending or recent search query.
    @MainActor
    func selectSuggestion(_ suggestion: String) {
        query = suggestion
        searchTask?.cancel()
        searchTask = Task {
            await performSearch()
        }
    }

    /// Clear all recent searches.
    @MainActor
    func clearRecentSearches() {
        recentSearchesService.clear()
        recentSearches = []
    }

    @MainActor
    func clearSearch() {
        searchTask?.cancel()
        query = ""
        results = []
        totalResults = 0
        hasSearched = false
        error = nil
    }

    // MARK: - Private

    @MainActor
    private func performSearch() async {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else { return }

        isSearching = true
        error = nil

        do {
            let response = try await searchRepository.unifiedSearch(
                query: trimmedQuery,
                contentTypes: selectedFilter.apiContentTypes,
                page: 1,
                limit: 30
            )
            if !Task.isCancelled {
                results = response.results
                totalResults = response.total
                hasSearched = true
                recentSearches = recentSearchesService.save(trimmedQuery, existing: recentSearches)
            }
        } catch is CancellationError {
            return
        } catch {
            if !Task.isCancelled {
                self.error = error.localizedDescription
                logger.error("Search failed", error: error, context: ["query": trimmedQuery])
            }
        }

        isSearching = false
    }
}
