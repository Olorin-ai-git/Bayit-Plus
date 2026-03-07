import Foundation

/// Status of enrichment for a BYOC content item.
public enum BYOCEnrichmentStatus: String, Codable, Sendable {
    case pending
    case enriching
    case enriched
    case partial
    case failed
    case cached
}

/// Request payload sent to POST /api/v1/byoc/enrich.
public struct BYOCEnrichmentRequest: Codable, Sendable {
    public let sourceType: String
    public let externalId: String
    public let title: String
    public let year: Int?
    public let durationSeconds: Int?
    public let imdbId: String?
    public let tmdbId: Int?
    public let thumbnailUrl: String?
    public let backdropUrl: String?
    public let genre: String?
    public let streamUrl: String?
    public let subtitleLanguagesRequested: [String]
    public let generateInteractionMoments: Bool

    public init(
        sourceType: String,
        externalId: String,
        title: String,
        year: Int? = nil,
        durationSeconds: Int? = nil,
        imdbId: String? = nil,
        tmdbId: Int? = nil,
        thumbnailUrl: String? = nil,
        backdropUrl: String? = nil,
        genre: String? = nil,
        streamUrl: String? = nil,
        subtitleLanguagesRequested: [String] = [],
        generateInteractionMoments: Bool = false
    ) {
        self.sourceType = sourceType
        self.externalId = externalId
        self.title = title
        self.year = year
        self.durationSeconds = durationSeconds
        self.imdbId = imdbId
        self.tmdbId = tmdbId
        self.thumbnailUrl = thumbnailUrl
        self.backdropUrl = backdropUrl
        self.genre = genre
        self.streamUrl = streamUrl
        self.subtitleLanguagesRequested = subtitleLanguagesRequested
        self.generateInteractionMoments = generateInteractionMoments
    }
}

/// Subtitle detail within an enrichment result.
public struct BYOCSubtitleDetail: Codable, Sendable {
    public let source: String
    public let cueCount: Int

    public init(source: String, cueCount: Int) {
        self.source = source
        self.cueCount = cueCount
    }
}

/// Response from POST /api/v1/byoc/enrich.
public struct BYOCEnrichmentResult: Codable, Sendable, Identifiable {
    public let contentId: String
    public let availableSubtitleLanguages: [String]
    public let enrichmentStatus: String
    public let subtitleDetails: [String: BYOCSubtitleDetail]?

    public var id: String {
        contentId
    }

    public init(
        contentId: String,
        availableSubtitleLanguages: [String],
        enrichmentStatus: String,
        subtitleDetails: [String: BYOCSubtitleDetail]? = nil
    ) {
        self.contentId = contentId
        self.availableSubtitleLanguages = availableSubtitleLanguages
        self.enrichmentStatus = enrichmentStatus
        self.subtitleDetails = subtitleDetails
    }
}

/// Batch enrichment request payload.
public struct BYOCBatchEnrichRequest: Codable, Sendable {
    public let items: [BYOCEnrichmentRequest]

    public init(items: [BYOCEnrichmentRequest]) {
        self.items = items
    }
}

/// Response from POST /api/v1/byoc/enrich/batch.
public struct BYOCBatchEnrichResponse: Codable, Sendable {
    public let jobId: String

    public init(jobId: String) {
        self.jobId = jobId
    }
}

/// Batch job status polling response.
public struct BYOCBatchJobStatus: Codable, Sendable {
    public let jobId: String
    public let status: String
    public let processed: Int
    public let total: Int
    public let results: [BYOCEnrichmentResult]?

    public init(
        jobId: String,
        status: String,
        processed: Int,
        total: Int,
        results: [BYOCEnrichmentResult]? = nil
    ) {
        self.jobId = jobId
        self.status = status
        self.processed = processed
        self.total = total
        self.results = results
    }
}
