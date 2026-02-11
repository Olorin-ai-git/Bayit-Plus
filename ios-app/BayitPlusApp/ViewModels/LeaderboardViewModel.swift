import BayitCore
import Foundation
import Observation

/// ViewModel for trivia leaderboard - manages leaderboard entries and pagination.
@MainActor
@Observable
final class LeaderboardViewModel {
    private(set) var entries: [LeaderboardEntry] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any StatsRepository
    private let logger = BayitLogger(category: "Leaderboard")

    init(repository: any StatsRepository) {
        self.repository = repository
    }

    @MainActor
    func load(limit: Int = 50) async {
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchLeaderboard(limit: limit)
            entries = response.entries

            logger.info("Leaderboard loaded", context: [
                "entryCount": String(entries.count)
            ])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to load leaderboard", error: error)
        }

        isLoading = false
    }

    @MainActor
    func refresh() async {
        await load()
    }
}
