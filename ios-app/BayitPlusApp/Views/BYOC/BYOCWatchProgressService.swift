import BayitBYOC
import BayitCore
import Foundation

/// Reports BYOC watch progress to the backend watch-history endpoint.
/// Uses content_id from enrichment result if available; synthetic ID otherwise.
@MainActor
final class BYOCWatchProgressService {
    private let logger = BayitLogger(category: "BYOCWatchProgress")
    private let progressKey = "tv.bayit.plus.byoc.watchprogress"

    private let repository: any MediaRepository

    init(repository: any MediaRepository) {
        self.repository = repository
    }

    // MARK: - Report Progress

    /// Report progress for a BYOC item. Called when player dismisses.
    func reportProgress(
        item: BYOCContentItem,
        enrichmentResult: BYOCEnrichmentResult?,
        position: TimeInterval,
        duration: TimeInterval
    ) async {
        guard position > 0, duration > 0 else { return }

        let contentId = resolvedContentId(item: item, enrichmentResult: enrichmentResult)
        let request = WatchProgressRequest(
            contentId: contentId,
            contentType: item.contentType.rawValue,
            position: position,
            duration: duration
        )

        do {
            _ = try await repository.updateProgress(request: request)
            cacheProgress(contentId: contentId, position: position, duration: duration)
            logger.info(
                "Progress saved",
                context: ["contentId": contentId, "position": "\(Int(position))"]
            )
        } catch {
            cacheProgress(contentId: contentId, position: position, duration: duration)
            logger.error("Progress save failed", error: error, context: ["contentId": contentId])
        }
    }

    // MARK: - Read Progress

    /// Get cached progress percentage (0-100) for display on cards.
    func cachedProgress(for item: BYOCContentItem, enrichmentResult: BYOCEnrichmentResult?) -> Double? {
        let contentId = resolvedContentId(item: item, enrichmentResult: enrichmentResult)
        guard let stored = loadCache()[contentId] else { return nil }
        let duration = stored["duration"] ?? 0
        guard duration > 0 else { return nil }
        let position = stored["position"] ?? 0
        return min((position / duration) * 100, 100)
    }

    // MARK: - Private

    private func resolvedContentId(
        item: BYOCContentItem,
        enrichmentResult: BYOCEnrichmentResult?
    ) -> String {
        if let backendId = enrichmentResult?.contentId {
            return backendId
        }
        return "byoc:\(item.sourceType.rawValue):\(item.id)"
    }

    private func cacheProgress(contentId: String, position: TimeInterval, duration: TimeInterval) {
        var cache = loadCache()
        cache[contentId] = ["position": position, "duration": duration]
        if let encoded = try? JSONEncoder().encode(cache) {
            UserDefaults.standard.set(encoded, forKey: progressKey)
        }
    }

    private func loadCache() -> [String: [String: TimeInterval]] {
        guard let data = UserDefaults.standard.data(forKey: progressKey),
              let decoded = try? JSONDecoder().decode(
                  [String: [String: TimeInterval]].self, from: data
              )
        else { return [:] }
        return decoded
    }
}
