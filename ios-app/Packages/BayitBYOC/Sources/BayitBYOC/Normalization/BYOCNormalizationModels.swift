import Foundation

/// A manifest entry sent to the backend for normalization.
public struct BYOCManifestEntry: Codable, Sendable {
    public let name: String
    public let group: String?
    public let logoUrl: String?
    public let epgId: String?
    public let contentType: String
    public let year: Int?
    public let durationSeconds: Int?
    public let languageHint: String?
    public let resolutionTag: String?
    public let sourceType: String
}

/// Client-side health probe results.
public struct HealthSampleResult: Codable, Sendable {
    public var tested: Int = 0
    public var alive: Int = 0
    public var deadIndices: [Int] = []
}

/// Full manifest submitted for normalization.
public struct BYOCManifest: Codable, Sendable {
    public let entries: [BYOCManifestEntry]
    public let healthSample: HealthSampleResult?
    public let sourceType: String
}

/// A channel matched against the global index.
public struct MatchedChannel: Codable, Sendable {
    public let index: Int
    public let originalName: String
    public let canonicalName: String
    public let logoUrl: String?
    public let epgId: String?
    public let category: String
    public let language: String
    public let country: String
    public let confidence: Double
}

/// A VOD item matched against TMDB.
public struct MatchedVOD: Codable, Sendable {
    public let index: Int
    public let originalName: String
    public let tmdbId: Int?
    public let imdbId: String?
    public let posterUrl: String?
    public let backdropUrl: String?
    public let overview: String?
    public let genres: [String]
    public let year: Int?
    public let confidence: Double
}

/// A group of detected duplicate channels.
public struct DuplicateGroup: Codable, Sendable {
    public let canonicalName: String
    public let primaryIndex: Int
    public let alternateIndices: [Int]
    public let primaryResolution: String?
}

/// An entry the pipeline could not classify.
public struct UnresolvedEntry: Codable, Sendable {
    public let index: Int
    public let name: String
    public let group: String?
    public let aiSuggestion: String?
    public let aiCategory: String?
    public let aiConfidence: Double
}

/// Normalization statistics.
public struct NormalizationStats: Codable, Sendable {
    public let total: Int
    public let matchedChannels: Int
    public let matchedVod: Int
    public let duplicatesFound: Int
    public let unresolved: Int
}

/// Complete normalization plan from the backend.
public struct NormalizationPlan: Codable, Sendable {
    public let jobId: String
    public let status: String
    public let matchedChannels: [MatchedChannel]
    public let matchedVod: [MatchedVOD]
    public let duplicates: [DuplicateGroup]
    public let unresolved: [UnresolvedEntry]
    public let detectedLanguages: [String]
    public let suggestedCategories: [String]
    public let healthSample: HealthSampleResult?
    public let stats: NormalizationStats
    public let progress: Double
    public let stage: String
}

/// Job status response from polling endpoint.
public struct NormalizationJobStatus: Codable, Sendable {
    public let jobId: String
    public let status: String
    public let progress: Double
    public let stage: String
    public let plan: NormalizationPlan?
}

/// Known IPTV provider from the backend.
public struct BYOCProviderInfo: Codable, Sendable, Identifiable {
    public var id: String {
        slug
    }

    public let name: String
    public let slug: String
    public let logoUrl: String?
    public let connectionTypes: [String]
    public let serverUrl: String?
    public let m3uUrlTemplate: String?
    public let setupInstructionsKey: String?
}
