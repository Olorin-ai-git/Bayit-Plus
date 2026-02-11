import BayitCore
import Foundation
import Observation

/// ViewModel for Trending - fetches trending topics, headlines,
/// and AI-powered content recommendations.
@MainActor
@Observable
final class TrendingViewModel {
    private(set) var topics: [TrendingTopic] = []
    private(set) var headlines: [TrendingHeadline] = []
    private(set) var recommendations: [ContentItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any TrendingRepository
    private let logger = BayitLogger(category: "Trending")

    init(repository: any TrendingRepository) {
        self.repository = repository
    }

    @MainActor
    func loadAll() async {
        isLoading = true
        error = nil

        async let topicsResult = repository.fetchTopics()
        async let headlinesResult = repository.fetchHeadlines(source: nil, limit: nil)
        async let recsResult = repository.fetchRecommendations(limit: nil)

        do {
            let (t, h, r) = try await (topicsResult, headlinesResult, recsResult)
            topics = t
            headlines = h
            recommendations = r
            logger.info("Trending data loaded", context: [
                "topicCount": String(t.count),
                "headlineCount": String(h.count),
                "recCount": String(r.count)
            ])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to load trending data", error: error)
        }

        isLoading = false
    }

    @MainActor
    func refresh() async {
        await loadAll()
    }
}
