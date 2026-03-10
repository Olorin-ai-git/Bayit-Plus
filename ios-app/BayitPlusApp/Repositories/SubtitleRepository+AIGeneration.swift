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
                URLQueryItem(name: "force", value: String(force)),
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
                URLQueryItem(name: "force", value: String(force)),
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
                URLQueryItem(name: "force", value: String(force)),
            ],
            as: AIGenerationJobResponse.self
        )
    }

    /// Start AI generation for engrew (English with Hebrew words) subtitles.
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
                URLQueryItem(name: "force", value: String(force)),
            ],
            as: AIGenerationJobResponse.self
        )
    }

    /// Start AI generation for grammar-flip subtitles.
    func generateGrammarFlip(
        contentId: String,
        language: String = "en",
        force: Bool = false
    ) async throws -> AIGenerationJobResponse {
        return try await client.post(
            "/api/v1/subtitles/\(contentId)/grammar-flip",
            body: EmptyRequest(),
            queryItems: [
                URLQueryItem(name: "language", value: language),
                URLQueryItem(name: "force", value: String(force)),
            ],
            as: AIGenerationJobResponse.self
        )
    }

    /// Start AI generation for slang-synthesis subtitles.
    func generateSlangSynthesis(
        contentId: String,
        language: String = "en",
        force: Bool = false
    ) async throws -> AIGenerationJobResponse {
        return try await client.post(
            "/api/v1/subtitles/\(contentId)/slang-synthesis",
            body: EmptyRequest(),
            queryItems: [
                URLQueryItem(name: "language", value: language),
                URLQueryItem(name: "force", value: String(force)),
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

// MARK: - Helper Types

private struct EmptyRequest: Encodable, Sendable {}
