import BayitCore
import Foundation
import Observation

/// ViewModel for LLM-powered natural language search - manages query input,
/// AI interpretation display, suggestions, and search result presentation.
@Observable
final class LLMSearchViewModel {
    var query = ""
    private(set) var results: [ContentItem] = []
    private(set) var interpretation: SearchInterpretation?
    private(set) var suggestions: [String] = []
    private(set) var isSearching = false
    private(set) var isLoadingSuggestions = false
    private(set) var error: String?
    private(set) var hasSearched = false

    private let repository: any LLMSearchRepository
    private var suggestionsTask: Task<Void, Never>?
    private let logger = BayitLogger(category: "LLMSearch")
    private let suggestionsDebounce: Duration = .milliseconds(400)

    init(repository: any LLMSearchRepository) {
        self.repository = repository
    }

    @MainActor
    func search(language: String?) async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        isSearching = true
        error = nil

        do {
            let request = LLMSearchRequest(
                query: trimmed,
                type: nil,
                language: language,
                limit: nil,
                includeUserContext: true
            )
            let response = try await repository.llmSearch(request)
            results = response.results ?? []
            interpretation = response.interpretation
            hasSearched = true
            logger.info("LLM search completed", context: [
                "query": trimmed,
                "resultCount": String(results.count),
                "confidence": String(interpretation?.confidence ?? 0)
            ])
        } catch {
            self.error = error.localizedDescription
            logger.error("LLM search failed", error: error, context: [
                "query": trimmed
            ])
        }

        isSearching = false
    }

    @MainActor
    func onQueryChanged() {
        suggestionsTask?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            suggestions = []
            return
        }

        suggestionsTask = Task {
            try? await Task.sleep(for: suggestionsDebounce)
            guard !Task.isCancelled else { return }
            await loadSuggestions(trimmed)
        }
    }

    @MainActor
    func clearSearch() {
        suggestionsTask?.cancel()
        query = ""
        results = []
        interpretation = nil
        suggestions = []
        hasSearched = false
        error = nil
    }

    @MainActor
    private func loadSuggestions(_ query: String) async {
        isLoadingSuggestions = true

        do {
            suggestions = try await repository.fetchSuggestions(query: query)
        } catch is CancellationError {
            return
        } catch {
            logger.error("Failed to load suggestions", error: error)
        }

        isLoadingSuggestions = false
    }
}
