import BayitCore
import Foundation

/// Manages the enrichment queue and exposes observable state.
@MainActor
@Observable
public final class BYOCEnrichmentQueue {
    private let logger = BayitLogger(category: "BYOCEnrichmentQueue")
    private let service: BYOCEnrichmentService

    /// Per-item enrichment status keyed by external ID.
    public private(set) var itemStates: [String: BYOCEnrichmentStatus] = [:]

    /// Active batch job ID, if any.
    public private(set) var batchJobId: String?

    /// Progress of the active batch job.
    public private(set) var batchProgress: (processed: Int, total: Int)?

    public init(service: BYOCEnrichmentService) {
        self.service = service
    }

    /// Enrich a single item on demand.
    /// Returns immediately if a cached result exists.
    public func enrichSingle(_ item: BYOCContentItem) async {
        let externalId = buildExternalId(for: item)

        if BYOCEnrichmentCache.get(externalId) != nil {
            itemStates[externalId] = .cached
            return
        }

        itemStates[externalId] = .enriching
        do {
            let request = buildRequest(from: item)
            let result = try await service.enrich(request)
            BYOCEnrichmentCache.set(result, for: externalId)
            itemStates[externalId] = mapStatus(
                result.enrichmentStatus
            )
            logger.info(
                "Enrichment completed",
                context: [
                    "id": externalId,
                    "status": result.enrichmentStatus,
                ]
            )
        } catch {
            itemStates[externalId] = .failed
            logger.error(
                "Enrichment failed",
                error: error,
                context: ["id": externalId]
            )
        }
    }

    /// Start batch enrichment for a collection of items.
    public func enrichBatch(_ items: [BYOCContentItem]) async {
        let requests = items.map { buildRequest(from: $0) }
        guard !requests.isEmpty else { return }

        do {
            let jobId = try await service.enrichBatch(requests)
            batchJobId = jobId
            batchProgress = (processed: 0, total: items.count)

            for item in items {
                itemStates[buildExternalId(for: item)] = .enriching
            }

            await pollBatchStatus(
                jobId: jobId, items: items
            )
        } catch {
            for item in items {
                itemStates[buildExternalId(for: item)] = .failed
            }
            logger.error(
                "Batch enrichment failed to start",
                error: error,
                context: ["itemCount": "\(items.count)"]
            )
        }
    }

    /// Get the cached enrichment result for an item.
    public func result(
        for item: BYOCContentItem
    ) -> BYOCEnrichmentResult? {
        let externalId = buildExternalId(for: item)
        return BYOCEnrichmentCache.get(externalId)
    }

    // MARK: - Private

    private func pollBatchStatus(
        jobId: String,
        items: [BYOCContentItem]
    ) async {
        let pollingIntervalNanoseconds: UInt64 = 2_000_000_000
        var completed = false

        while !completed {
            try? await Task.sleep(
                nanoseconds: pollingIntervalNanoseconds
            )

            do {
                let status = try await service.batchStatus(
                    jobId: jobId
                )
                batchProgress = (
                    processed: status.processed,
                    total: status.total
                )

                if let results = status.results {
                    cacheResults(results, items: items)
                }

                if status.status == "completed"
                    || status.status == "failed"
                {
                    completed = true
                    batchJobId = nil
                    batchProgress = nil
                    logger.info(
                        "Batch enrichment finished",
                        context: [
                            "jobId": jobId,
                            "status": status.status,
                        ]
                    )
                }
            } catch {
                completed = true
                batchJobId = nil
                batchProgress = nil
                logger.error(
                    "Batch status polling failed",
                    error: error,
                    context: ["jobId": jobId]
                )
            }
        }
    }

    private func cacheResults(
        _ results: [BYOCEnrichmentResult],
        items: [BYOCContentItem]
    ) {
        for result in results {
            let matching = items.first {
                buildExternalId(for: $0) == result.contentId
            }
            let key = matching.map {
                buildExternalId(for: $0)
            } ?? result.contentId

            BYOCEnrichmentCache.set(result, for: key)
            itemStates[key] = mapStatus(
                result.enrichmentStatus
            )
        }
    }

    private func buildExternalId(
        for item: BYOCContentItem
    ) -> String {
        "byoc:\(item.sourceType.rawValue):\(item.id)"
    }

    private func buildRequest(
        from item: BYOCContentItem
    ) -> BYOCEnrichmentRequest {
        BYOCEnrichmentRequest(
            sourceType: item.sourceType.rawValue,
            externalId: buildExternalId(for: item),
            title: item.title,
            year: item.year,
            durationSeconds: item.duration,
            thumbnailUrl: item.thumbnailURL?.absoluteString,
            backdropUrl: item.backdropURL?.absoluteString,
            genre: item.genre,
            streamUrl: item.streamURL?.absoluteString
        )
    }

    private func mapStatus(
        _ statusString: String
    ) -> BYOCEnrichmentStatus {
        BYOCEnrichmentStatus(rawValue: statusString) ?? .partial
    }
}
