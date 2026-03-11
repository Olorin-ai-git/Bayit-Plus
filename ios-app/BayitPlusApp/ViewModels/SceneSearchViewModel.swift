import BayitCore
import BayitLocalization
import Foundation
import Observation

/// ViewModel for scene search within live TV content.
/// Shared across iOS and tvOS.
@MainActor
@Observable
final class SceneSearchViewModel {
    private(set) var results: [SceneSearchResult] = []
    private(set) var isSearching = false
    private(set) var error: String?
    var query = ""

    private let repository: any LiveTVRepository
    private let localization: LocalizationManager
    private let logger = BayitLogger(category: "SceneSearchViewModel")

    init(repository: any LiveTVRepository, localization: LocalizationManager) {
        self.repository = repository
        self.localization = localization
    }

    func search(channelId: String) async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        isSearching = true
        error = nil

        do {
            let response = try await repository.searchScenes(
                channelId: channelId, query: trimmed
            )
            results = response.results ?? []
            logger.info("Scene search completed", context: [
                "channelId": channelId,
                "query": trimmed,
                "resultCount": "\(results.count)",
            ])
        } catch {
            self.error = localization.t("sceneSearch.searchFailed")
            logger.error("Scene search failed", error: error)
        }

        isSearching = false
    }

    func clearResults() {
        results = []
        query = ""
        error = nil
    }
}
