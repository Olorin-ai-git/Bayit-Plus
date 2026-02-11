import BayitCore
import Foundation
import Observation

/// ViewModel for the Search screen with unified search, filter pills,
/// trending searches, and recent search history.
@MainActor
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
    private let featureFlags: FeatureFlags
    private let logger = BayitLogger(category: "SearchViewModel")
    private var searchTask: Task<Void, Never>?
    private let debounceInterval: Duration = .milliseconds(300)

    init(
        searchRepository: any SearchRepository,
        featureFlags: FeatureFlags,
        recentSearchesService: RecentSearchesService = RecentSearchesService()
    ) {
        self.searchRepository = searchRepository
        self.featureFlags = featureFlags
        self.recentSearchesService = recentSearchesService
    }

    /// Load trending searches from API and recent from UserDefaults on view appear,
    /// then trigger an initial browse-all search.
    @MainActor
    func loadInitialData() async {
        recentSearches = recentSearchesService.load()

        do {
            trendingSearches = try await searchRepository.fetchTrendingSearches(limit: 10)
        } catch {
            logger.error("Failed to load trending searches", error: error)
        }

        await performSearch()
    }

    /// Debounced handler for query text changes.
    /// Empty query triggers browse-all; non-empty triggers debounced search.
    @MainActor
    func onQueryChanged() {
        searchTask?.cancel()

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

        isSearching = true
        error = nil

        do {
            // Include VOD in content types if legacy features are enabled
            var contentTypes = selectedFilter.apiContentTypes
            if featureFlags.isLegacyFeaturesEnabled && selectedFilter == .all {
                contentTypes = ["live", "radio", "podcast", "vod"]
            }

            let response = try await searchRepository.unifiedSearch(
                query: trimmedQuery,
                contentTypes: contentTypes,
                page: 1,
                limit: 30
            )
            if !Task.isCancelled {
                // Filter movies and series from results if legacy features are disabled
                var filteredResults = response.results
                if !featureFlags.isLegacyFeaturesEnabled {
                    filteredResults = filteredResults.filter { result in
                        let contentType = result.contentType?.lowercased() ?? ""
                        return contentType != "vod" && contentType != "movie" && contentType != "series"
                    }
                }
                if selectedFilter == .vod {
                    filteredResults = filteredResults.filter { $0.isSeries != true }
                }
                results = filteredResults
                totalResults = filteredResults.count
                hasSearched = true
                if !trimmedQuery.isEmpty {
                    recentSearches = recentSearchesService.save(trimmedQuery, existing: recentSearches)
                }
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
