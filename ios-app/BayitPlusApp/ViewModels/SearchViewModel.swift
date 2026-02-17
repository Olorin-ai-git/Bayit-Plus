import BayitCore
import Foundation
import Observation

/// ViewModel for the Search screen with unified search, sort, advanced filters,
/// pagination, API-backed history, and autocomplete suggestions.
@MainActor
@Observable
final class SearchViewModel {
    var query = ""
    var selectedFilter: SearchContentTypeFilter = .all
    var sortOption: SearchSortOption = .relevance
    var advancedFilters = SearchAdvancedFilters()
    var showSortSheet = false
    var showFilterSheet = false
    private(set) var results: [UnifiedSearchResult] = []
    private(set) var totalResults = 0
    private(set) var currentPage = 1
    private(set) var hasMore = false
    private(set) var isSearching = false
    private(set) var isLoadingMore = false
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
    private let searchPageSize = 30
    private let historyLimit = 20
    private let trendingLimit = 10
    private let suggestionsLimit = 5

    init(searchRepository: any SearchRepository, featureFlags: FeatureFlags,
         recentSearchesService: RecentSearchesService = RecentSearchesService()) {
        self.searchRepository = searchRepository
        self.featureFlags = featureFlags
        self.recentSearchesService = recentSearchesService
    }

    func loadInitialData() async {
        do { recentSearches = try await searchRepository.fetchSearchHistory(limit: historyLimit) }
        catch {
            recentSearches = recentSearchesService.load()
            logger.error("Failed to load search history from API", error: error)
        }
        do { trendingSearches = try await searchRepository.fetchTrendingSearches(limit: trendingLimit) }
        catch { logger.error("Failed to load trending searches", error: error) }
        await performSearch()
    }

    func onQueryChanged() {
        searchTask?.cancel()
        suggestionTask?.cancel()
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.count >= 2 {
            suggestionTask = Task {
                try? await Task.sleep(for: suggestionDebounceInterval)
                guard !Task.isCancelled else { return }
                await fetchSuggestions(for: trimmed)
            }
        } else { autocompleteSuggestions = [] }
        searchTask = Task {
            try? await Task.sleep(for: debounceInterval)
            guard !Task.isCancelled else { return }
            await performSearch()
        }
    }

    func onFilterChanged(_ filter: SearchContentTypeFilter) {
        guard filter != selectedFilter else { return }
        selectedFilter = filter
        searchTask?.cancel()
        searchTask = Task { await performSearch() }
    }

    func onSortChanged() { searchTask?.cancel(); searchTask = Task { await performSearch() } }
    func onFiltersApplied() { searchTask?.cancel(); searchTask = Task { await performSearch() } }
    func retrySearch() { searchTask?.cancel(); searchTask = Task { await performSearch() } }

    func selectSuggestion(_ suggestion: String) {
        query = suggestion
        autocompleteSuggestions = []
        searchTask?.cancel(); suggestionTask?.cancel()
        searchTask = Task { await performSearch() }
    }

    func clearRecentSearches() {
        recentSearchesService.clear()
        recentSearches = []
        Task.detached(priority: .utility) { [searchRepository, logger] in
            do { try await searchRepository.deleteSearchHistory(query: nil) }
            catch { logger.error("Failed to clear search history", error: error) }
        }
    }

    func clearSearch() {
        searchTask?.cancel(); suggestionTask?.cancel()
        query = ""; results = []; totalResults = 0; currentPage = 1
        hasMore = false; hasSearched = false; error = nil; autocompleteSuggestions = []
    }

    func clearFilters() {
        advancedFilters.reset(); selectedFilter = .all; sortOption = .relevance
        searchTask?.cancel(); searchTask = Task { await performSearch() }
    }

    func loadMore() {
        guard hasMore, !isLoadingMore, !isSearching else { return }
        isLoadingMore = true
        searchTask = Task { await performSearch(page: currentPage + 1, append: true) }
    }

    // MARK: - Private

    private func fetchSuggestions(for query: String) async {
        do {
            let suggestions = try await searchRepository.fetchSuggestions(query: query, limit: suggestionsLimit)
            if !Task.isCancelled { autocompleteSuggestions = suggestions }
        } catch { if !Task.isCancelled { autocompleteSuggestions = [] } }
    }

    private func performSearch(page: Int = 1, append: Bool = false) async {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if !append { isSearching = true }
        error = nil
        defer { isSearching = false; isLoadingMore = false }

        do {
            var contentTypes = selectedFilter.apiContentTypes
            if featureFlags.isLegacyFeaturesEnabled && selectedFilter == .all {
                contentTypes = ["live", "radio", "podcast", "vod"]
            }
            let response = try await searchRepository.unifiedSearch(
                query: trimmedQuery, contentTypes: contentTypes,
                page: page, limit: searchPageSize,
                sortBy: sortOption.apiSortBy, sortOrder: sortOption.apiSortOrder,
                yearMin: advancedFilters.yearFrom, yearMax: advancedFilters.yearTo,
                language: advancedFilters.language, hasSubtitles: advancedFilters.hasSubtitles,
                hasDubbing: advancedFilters.hasDubbing
            )
            guard !Task.isCancelled else { return }
            let filteredResults = selectedFilter.applyClientFilter(response.results)
            if append { results.append(contentsOf: filteredResults) }
            else { results = filteredResults }
            totalResults = response.total
            currentPage = page
            hasMore = response.hasMore
            hasSearched = true
            if !trimmedQuery.isEmpty && !append {
                recentSearches = recentSearchesService.save(trimmedQuery, existing: recentSearches)
                Task.detached(priority: .utility) { [searchRepository, logger] in
                    do { try await searchRepository.saveSearchHistory(query: trimmedQuery) }
                    catch { logger.error("Failed to save search history", error: error) }
                }
            }
        } catch is CancellationError { return }
        catch {
            guard !Task.isCancelled else { return }
            self.error = error.userFriendlyMessage
            logger.error("Search failed", error: error, context: ["query": trimmedQuery])
        }
    }
}
