import Foundation
import Observation

/// ViewModel for the Search screen - manages real-time search with debouncing
@Observable
final class SearchViewModel {
    var query = ""
    private(set) var results: [SearchResult] = []
    private(set) var isSearching = false
    private(set) var error: String?
    private(set) var hasSearched = false

    var selectedType: String?

    private let repository: any ContentRepository
    private var searchTask: Task<Void, Never>?
    private let debounceInterval: Duration = .milliseconds(300)

    init(repository: any ContentRepository) {
        self.repository = repository
    }

    @MainActor
    func onQueryChanged() {
        searchTask?.cancel()

        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            results = []
            hasSearched = false
            return
        }

        searchTask = Task {
            try? await Task.sleep(for: debounceInterval)

            guard !Task.isCancelled else { return }
            await performSearch()
        }
    }

    @MainActor
    func performSearch() async {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else { return }

        isSearching = true
        error = nil

        do {
            let response = try await repository.searchContent(
                query: trimmedQuery,
                type: selectedType,
                page: 1,
                limit: 30
            )
            if !Task.isCancelled {
                results = response.results
                hasSearched = true
            }
        } catch is CancellationError {
            return
        } catch {
            if !Task.isCancelled {
                self.error = error.localizedDescription
            }
        }

        isSearching = false
    }

    @MainActor
    func clearSearch() {
        searchTask?.cancel()
        query = ""
        results = []
        hasSearched = false
        error = nil
    }
}
