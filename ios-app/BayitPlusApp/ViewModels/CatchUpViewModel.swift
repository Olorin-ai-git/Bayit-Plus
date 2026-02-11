import BayitCore
import Foundation
import Observation

/// ViewModel for catch-up replay with transcript segments and AI summary.
/// Shared across iOS and tvOS.
@MainActor
@Observable
final class CatchUpViewModel {

    private(set) var segments: [CatchUpSegment] = []
    private(set) var summary: String?
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any LiveTVRepository
    private let logger = BayitLogger(category: "CatchUpViewModel")

    init(repository: any LiveTVRepository) {
        self.repository = repository
    }

    func loadCatchUp(channelId: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchCatchUp(channelId: channelId)
            segments = response.segments ?? []
            summary = response.summary
            logger.info("Catch-up loaded", context: [
                "channelId": channelId,
                "segmentCount": "\(segments.count)"
            ])
        } catch {
            self.error = "Unable to load catch-up content"
            logger.error("Catch-up load failed", error: error)
        }

        isLoading = false
    }
}
