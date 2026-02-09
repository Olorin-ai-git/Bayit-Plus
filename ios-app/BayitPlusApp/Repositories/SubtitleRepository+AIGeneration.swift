import BayitNetworking
import Foundation

/// Extension to SubtitleRepository adding AI subtitle generation capabilities.
/// These methods call the backend AI generation endpoints that already exist.
extension APISubtitleRepository {

    // MARK: - AI Generation Job Management

    /// Start AI generation for nikud (vowel marks) subtitles.
    /// - Parameters:
    ///   - contentId: Content identifier
    ///   - language: Language code (default: "he")
    ///   - force: Force regeneration even if already exists
    /// - Returns: Job status response with job_id for polling
    func generateNikud(
        contentId: String,
        language: String = "he",
        force: Bool = false
    ) async throws -> AIGenerationJobResponse {
        struct Request: Encodable, Sendable {
            let language: String
            let force: Bool
        }

        return try await client.post(
            "/api/v1/subtitles/\(contentId)/nikud",
            body: EmptyRequest(),
            queryItems: [
                URLQueryItem(name: "language", value: language),
                URLQueryItem(name: "force", value: String(force))
            ],
            as: AIGenerationJobResponse.self
        )
    }

    /// Start AI generation for shoresh (root words) subtitles.
    /// - Parameters:
    ///   - contentId: Content identifier
    ///   - language: Language code (default: "he")
    ///   - force: Force regeneration even if already exists
    /// - Returns: Job status response with job_id for polling
    func generateShoresh(
        contentId: String,
        language: String = "he",
        force: Bool = false
    ) async throws -> AIGenerationJobResponse {
        return try await client.post(
            "/api/v1/subtitles/\(contentId)/shoresh",
            body: EmptyRequest(),
            queryItems: [
                URLQueryItem(name: "language", value: language),
                URLQueryItem(name: "force", value: String(force))
            ],
            as: AIGenerationJobResponse.self
        )
    }

    /// Start AI generation for heblish (Hebrew with English words) subtitles.
    /// - Parameters:
    ///   - contentId: Content identifier
    ///   - language: Language code (default: "he")
    ///   - force: Force regeneration even if already exists
    /// - Returns: Job status response with job_id for polling
    func generateHeblish(
        contentId: String,
        language: String = "he",
        force: Bool = false
    ) async throws -> AIGenerationJobResponse {
        return try await client.post(
            "/api/v1/subtitles/\(contentId)/heblish",
            body: EmptyRequest(),
            queryItems: [
                URLQueryItem(name: "language", value: language),
                URLQueryItem(name: "force", value: String(force))
            ],
            as: AIGenerationJobResponse.self
        )
    }

    /// Start AI generation for engrew (English with Hebrew words) subtitles.
    /// - Parameters:
    ///   - contentId: Content identifier
    ///   - language: Language code (default: "en")
    ///   - force: Force regeneration even if already exists
    /// - Returns: Job status response with job_id for polling
    func generateEngrew(
        contentId: String,
        language: String = "en",
        force: Bool = false
    ) async throws -> AIGenerationJobResponse {
        return try await client.post(
            "/api/v1/subtitles/\(contentId)/engrew",
            body: EmptyRequest(),
            queryItems: [
                URLQueryItem(name: "language", value: language),
                URLQueryItem(name: "force", value: String(force))
            ],
            as: AIGenerationJobResponse.self
        )
    }

    /// Get status of an AI generation job.
    /// Poll this endpoint to track progress.
    /// - Parameter jobId: Job identifier from generation response
    /// - Returns: Current job status with progress percentage
    func getJobStatus(jobId: String) async throws -> AIGenerationJobResponse {
        return try await client.get(
            "/api/v1/subtitles/job/\(jobId)",
            as: AIGenerationJobResponse.self
        )
    }

    /// Cancel an in-progress AI generation job.
    /// Only pending or processing jobs can be cancelled.
    /// - Parameter jobId: Job identifier to cancel
    /// - Returns: Cancellation confirmation with updated job status
    func cancelJob(jobId: String) async throws -> CancelJobResponse {
        return try await client.post(
            "/api/v1/subtitles/job/\(jobId)/cancel",
            body: EmptyRequest(),
            as: CancelJobResponse.self
        )
    }

    /// Get any active generation jobs for content.
    /// Returns status for all AI generation job types if active.
    /// - Parameter contentId: Content identifier
    /// - Returns: Active jobs for nikud, shoresh, heblish, and engrew
    func getActiveJobs(contentId: String) async throws -> ActiveJobsResponse {
        return try await client.get(
            "/api/v1/subtitles/\(contentId)/job/active",
            as: ActiveJobsResponse.self
        )
    }
}

// MARK: - Response Models

/// Response from AI generation job creation/status endpoints.
struct AIGenerationJobResponse: Decodable, Sendable {
    let jobId: String?
    let status: JobStatus
    let progress: Int
    let errorMessage: String?
    let message: String?
    let contentId: String
    let generatedAt: String?

    enum CodingKeys: String, CodingKey {
        case jobId = "job_id"
        case status
        case progress
        case errorMessage = "error_message"
        case message
        case contentId = "content_id"
        case generatedAt = "generated_at"
    }
}

/// Job status enumeration matching backend JobStatus enum.
enum JobStatus: String, Decodable, Sendable {
    case pending
    case processing
    case completed
    case failed
    case cancelled
}

/// Response from cancel job endpoint.
struct CancelJobResponse: Decodable, Sendable {
    let message: String
    let job: AIGenerationJobResponse
}

/// Response from active jobs endpoint.
struct ActiveJobsResponse: Decodable, Sendable {
    let contentId: String
    let nikudJob: AIGenerationJobResponse?
    let shoreshJob: AIGenerationJobResponse?
    let heblishJob: AIGenerationJobResponse?
    let engrewJob: AIGenerationJobResponse?

    enum CodingKeys: String, CodingKey {
        case contentId = "content_id"
        case nikudJob = "nikud_job"
        case shoreshJob = "shoresh_job"
        case heblishJob = "heblish_job"
        case engrewJob = "engrew_job"
    }
}

// MARK: - Helper Types

private struct EmptyRequest: Encodable, Sendable {}
