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
    private(set) var autocompleteSuggestions: [String] = []

    private let searchRepository: any SearchRepository
    private let recentSearchesService: RecentSearchesService
    private let featureFlags: FeatureFlags
    private let logger = BayitLogger(category: "SearchViewModel")
    private var searchTask: Task<Void, Never>?
    private var suggestionTask: Task<Void, Never>?
    private let debounceInterval: Duration = .milliseconds(300)
    private let suggestionDebounceInterval: Duration = .milliseconds(150)

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
        suggestionTask?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)

        // Fetch autocomplete suggestions with shorter debounce
        if trimmed.count >= 2 {
            suggestionTask = Task {
                try? await Task.sleep(for: suggestionDebounceInterval)
                guard !Task.isCancelled else { return }
                await fetchSuggestions(for: trimmed)
            }
        } else {
            autocompleteSuggestions = []
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

        searchTask = Task {
            await performSearch()
        }
    }

    /// Select a trending, recent, or autocomplete search query.
    @MainActor
    func selectSuggestion(_ suggestion: String) {
        query = suggestion
        autocompleteSuggestions = []
        searchTask?.cancel()
        suggestionTask?.cancel()
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
        suggestionTask?.cancel()
        query = ""
        results = []
        totalResults = 0
        hasSearched = false
        error = nil
        autocompleteSuggestions = []
    }

    // MARK: - Private

    @MainActor
    private func fetchSuggestions(for query: String) async {
        do {
            let suggestions = try await searchRepository.fetchSuggestions(query: query, limit: 5)
            if !Task.isCancelled {
                autocompleteSuggestions = suggestions
            }
        } catch {
            if !Task.isCancelled {
                autocompleteSuggestions = []
            }
        }
    }

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
                var filteredResults = response.results

                // Apply filter-specific logic
                switch selectedFilter {
                case .movies:
                    filteredResults = filteredResults.filter { result in
                        let contentType = result.contentType?.lowercased() ?? ""
                        return (contentType == "vod" || contentType == "movie") && result.isSeries != true && !(contentType.contains("collection"))
                    }
                case .series:
                    filteredResults = filteredResults.filter { $0.isSeries == true }
                case .collections:
                    filteredResults = filteredResults.filter { result in
                        let contentType = result.contentType?.lowercased() ?? ""
                        return contentType.contains("collection")
                    }
                case .kids:
                    filteredResults = filteredResults.filter { $0.isKidsContent == true }
                default:
                    break
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
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
                logger.error("Search failed", error: error, context: ["query": trimmedQuery])
            }
        }

        isSearching = false
    }
}
