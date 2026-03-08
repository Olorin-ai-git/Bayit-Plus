import BayitCore
import Foundation

/// Service that enriches BYOC content by calling the Bayit+ backend.
public final class BYOCEnrichmentService: Sendable {
    private let logger = BayitLogger(category: "BYOCEnrichment")
    private let baseURL: URL
    private let session: URLSession

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    /// Enrich a single BYOC content item.
    public func enrich(
        _ request: BYOCEnrichmentRequest
    ) async throws -> BYOCEnrichmentResult {
        let url = baseURL.appendingPathComponent("byoc/enrich")
        let urlRequest = try buildPostRequest(url: url, body: request)

        let (data, response) = try await session.data(for: urlRequest)
        try validateResponse(response)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        do {
            return try decoder.decode(
                BYOCEnrichmentResult.self, from: data
            )
        } catch {
            logger.error(
                "Failed to decode enrichment response",
                error: error, context: [:]
            )
            throw BYOCEnrichmentError.decodingError
        }
    }

    /// Start batch enrichment and return the job ID for polling.
    public func enrichBatch(
        _ items: [BYOCEnrichmentRequest]
    ) async throws -> String {
        let url = baseURL.appendingPathComponent(
            "byoc/enrich/batch"
        )
        let body = BYOCBatchEnrichRequest(items: items)
        let urlRequest = try buildPostRequest(url: url, body: body)

        let (data, response) = try await session.data(for: urlRequest)
        try validateResponse(response)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        do {
            let result = try decoder.decode(
                BYOCBatchEnrichResponse.self, from: data
            )
            logger.info(
                "Batch enrichment started",
                context: [
                    "jobId": result.jobId,
                    "itemCount": "\(items.count)",
                ]
            )
            return result.jobId
        } catch {
            logger.error(
                "Failed to decode batch response",
                error: error, context: [:]
            )
            throw BYOCEnrichmentError.decodingError
        }
    }

    /// Poll the status of a batch enrichment job.
    public func batchStatus(
        jobId: String
    ) async throws -> BYOCBatchJobStatus {
        let url = baseURL.appendingPathComponent(
            "byoc/enrich/batch/\(jobId)/status"
        )
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        urlRequest.setValue(
            "application/json",
            forHTTPHeaderField: "Accept"
        )

        let (data, response) = try await session.data(for: urlRequest)
        try validateResponse(response)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        do {
            return try decoder.decode(
                BYOCBatchJobStatus.self, from: data
            )
        } catch {
            logger.error(
                "Failed to decode batch status",
                error: error,
                context: ["jobId": jobId]
            )
            throw BYOCEnrichmentError.decodingError
        }
    }

    // MARK: - Private

    private func buildPostRequest<T: Encodable>(
        url: URL,
        body: T
    ) throws -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(
            "application/json",
            forHTTPHeaderField: "Content-Type"
        )
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        request.httpBody = try encoder.encode(body)
        return request
    }

    private func validateResponse(
        _ response: URLResponse
    ) throws {
        guard let http = response as? HTTPURLResponse else {
            throw BYOCEnrichmentError.serverError
        }
        guard (200 ... 299).contains(http.statusCode) else {
            logger.error(
                "Enrichment request failed",
                context: ["statusCode": "\(http.statusCode)"]
            )
            throw BYOCEnrichmentError.serverError
        }
    }
}

/// Errors from the BYOC enrichment service.
public enum BYOCEnrichmentError: Error, LocalizedError, Sendable {
    case serverError
    case decodingError
    case batchTooLarge

    public var errorDescription: String? {
        switch self {
        case .serverError: return "Enrichment server error"
        case .decodingError: return "Failed to decode enrichment response"
        case .batchTooLarge: return "Too many items in enrichment batch"
        }
    }
}
