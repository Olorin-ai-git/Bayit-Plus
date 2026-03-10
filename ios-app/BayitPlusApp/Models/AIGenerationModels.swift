import Foundation

/// Response from AI generation job creation/status endpoints.
/// CodingKeys use camelCase raw values to match APIClient's convertFromSnakeCase
/// decoder (which converts job_id -> jobId before matching against CodingKeys).
struct AIGenerationJobResponse: Decodable, Sendable {
    let jobId: String?
    let status: JobStatus
    let progress: Int
    let errorMessage: String?
    let message: String?
    let contentId: String
    let generatedAt: String?

    private enum CodingKeys: String, CodingKey {
        case jobId, status, progress, errorMessage, message, contentId, generatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        jobId = try container.decodeIfPresent(String.self, forKey: .jobId)
        let decodedStatus = try container.decode(JobStatus.self, forKey: .status)
        status = decodedStatus
        let defaultProgress = decodedStatus == .completed ? 100 : 0
        progress = try container.decodeIfPresent(Int.self, forKey: .progress) ?? defaultProgress
        errorMessage = try container.decodeIfPresent(String.self, forKey: .errorMessage)
        message = try container.decodeIfPresent(String.self, forKey: .message)
        contentId = try container.decode(String.self, forKey: .contentId)
        generatedAt = try container.decodeIfPresent(String.self, forKey: .generatedAt)
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
/// Note: No explicit CodingKeys - APIClient's convertFromSnakeCase handles mapping.
struct ActiveJobsResponse: Decodable, Sendable {
    let contentId: String
    let nikudJob: AIGenerationJobResponse?
    let shoreshJob: AIGenerationJobResponse?
    let heblishJob: AIGenerationJobResponse?
    let engrewJob: AIGenerationJobResponse?
    let grammarFlipJob: AIGenerationJobResponse?
    let slangSynthesisJob: AIGenerationJobResponse?
}
