import BayitNetworking
import Foundation

// MARK: - APIUserRepository: Downloads, Recordings, Verification, Account

extension APIUserRepository {
    // MARK: - Downloads

    func fetchDownloads() async throws -> [DownloadItem] {
        return try await client.get(
            "/api/v1/downloads",
            as: [DownloadItem].self
        )
    }

    func startDownload(request: DownloadStartRequest) async throws -> DownloadStartResponse {
        return try await client.post(
            "/api/v1/downloads",
            body: request,
            as: DownloadStartResponse.self
        )
    }

    func checkDownload(contentId: String) async throws -> DownloadCheckResponse {
        return try await client.get(
            "/api/v1/downloads/check/\(contentId)",
            as: DownloadCheckResponse.self
        )
    }

    func deleteDownload(downloadId: String) async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/downloads/\(downloadId)",
            as: MessageResponse.self
        )
    }

    // MARK: - Recordings

    func fetchRecordings() async throws -> RecordingsResponse {
        return try await client.get(
            "/api/v1/recordings",
            as: RecordingsResponse.self
        )
    }

    func startRecording(request: RecordingStartRequest) async throws -> RecordingStartResponse {
        return try await client.post(
            "/api/v1/recordings/start",
            body: request,
            as: RecordingStartResponse.self
        )
    }

    func stopRecording(recordingId: String) async throws -> MessageResponse {
        return try await client.post(
            "/api/v1/recordings/\(recordingId)/stop",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    func deleteRecording(recordingId: String) async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/recordings/\(recordingId)",
            as: MessageResponse.self
        )
    }

    // MARK: - Verification

    func sendPhoneVerification(phoneNumber: String) async throws -> PhoneVerificationSendResponse {
        let request = PhoneVerificationRequest(phoneNumber: phoneNumber)
        return try await client.post(
            "/api/v1/verification/phone/send",
            body: request,
            as: PhoneVerificationSendResponse.self
        )
    }

    func verifyPhone(code: String) async throws -> PhoneVerificationResponse {
        let request = PhoneVerificationCodeRequest(code: code)
        return try await client.post(
            "/api/v1/verification/phone/verify",
            body: request,
            as: PhoneVerificationResponse.self
        )
    }

    func getVerificationStatus() async throws -> VerificationStatusResponse {
        return try await client.get(
            "/api/v1/verification/status",
            as: VerificationStatusResponse.self
        )
    }

    // MARK: - Email Verification

    func sendEmailVerification() async throws -> MessageResponse {
        return try await client.post(
            "/api/v1/verification/email/send",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    // MARK: - Account Management

    func deleteAccount() async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/user/account",
            as: MessageResponse.self
        )
    }
}
