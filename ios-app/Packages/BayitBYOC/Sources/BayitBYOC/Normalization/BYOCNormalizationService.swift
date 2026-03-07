import BayitCore
import Foundation

/// Client-side service that calls the backend normalization API.
public actor BYOCNormalizationService {
    private let logger = BayitLogger(category: "BYOCNormalizationService")
    private let baseURL: URL
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    /// Submit a manifest for normalization. Returns job ID.
    public func submitManifest(
        _ manifest: BYOCManifest
    ) async throws -> String {
        let url = baseURL.appendingPathComponent("api/v1/byoc/normalize")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(manifest)

        let (data, response) = try await session.data(for: request)
        try validateResponse(response)

        let status = try decoder.decode(NormalizationJobStatus.self, from: data)
        logger.info(
            "Normalization submitted",
            context: ["jobId": status.jobId]
        )
        return status.jobId
    }

    /// Poll normalization job status until completed.
    public func pollUntilComplete(
        jobId: String,
        onProgress: (@Sendable (Double, String) -> Void)? = nil
    ) async throws -> NormalizationPlan {
        let url = baseURL.appendingPathComponent(
            "api/v1/byoc/normalize/\(jobId)/status"
        )
        let pollingInterval: UInt64 = 2_000_000_000

        while true {
            let request = URLRequest(url: url)
            let (data, response) = try await session.data(for: request)
            try validateResponse(response)

            let status = try decoder.decode(
                NormalizationJobStatus.self, from: data
            )
            onProgress?(status.progress, status.stage)

            if status.status == "completed", let plan = status.plan {
                logger.info(
                    "Normalization completed",
                    context: ["jobId": jobId]
                )
                return plan
            }
            if status.status == "failed" {
                throw NormalizationError.pipelineFailed
            }
            try await Task.sleep(nanoseconds: pollingInterval)
        }
    }

    /// Fetch the list of known IPTV providers.
    public func fetchProviders() async throws -> [BYOCProviderInfo] {
        let url = baseURL.appendingPathComponent("api/v1/byoc/providers")
        let request = URLRequest(url: url)
        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return try decoder.decode([BYOCProviderInfo].self, from: data)
    }

    /// Search the channel index.
    public func searchChannelIndex(
        query: String, limit: Int = 10
    ) async throws -> [[String: String]] {
        var components = URLComponents(
            url: baseURL.appendingPathComponent("api/v1/byoc/channel-index/search"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        let request = URLRequest(url: components.url!)
        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return try JSONSerialization.jsonObject(with: data) as? [[String: String]] ?? []
    }

    private func validateResponse(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw NormalizationError.invalidResponse
        }
        guard (200 ... 299).contains(http.statusCode) else {
            throw NormalizationError.httpError(statusCode: http.statusCode)
        }
    }
}

public enum NormalizationError: Error, Sendable {
    case invalidResponse
    case httpError(statusCode: Int)
    case pipelineFailed
}
