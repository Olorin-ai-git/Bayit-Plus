import BayitCore
import BayitNetworking
import Foundation
import Observation

/// ViewModel for Bilingual Bridge dubbing -- manages proficiency tracking,
/// session lifecycle, and segment translation via the backend API.
@MainActor
@Observable
final class BilingualDubbingViewModel {

    private(set) var proficiency: ProficiencyStatus?
    private(set) var activeSession: BilingualSession?
    private(set) var isActive = false
    private(set) var isLoading = false
    private(set) var error: String?

    private let apiClient: APIClient
    private let logger = BayitLogger(category: "BilingualDubbing")

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Fetch Proficiency

    func fetchProficiency(profileId: String) async {
        isLoading = true
        error = nil

        do {
            proficiency = try await apiClient.get(
                "/bilingual-dubbing/proficiency",
                queryItems: [URLQueryItem(name: "profile_id", value: profileId)],
                as: ProficiencyStatus.self
            )
            logger.info("Proficiency fetched", context: [
                "level": proficiency?.level ?? "unknown",
                "totalWords": String(proficiency?.totalWordsLearned ?? 0)
            ])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to fetch proficiency", error: error)
        }

        isLoading = false
    }

    // MARK: - Start Session

    func startSession(contentId: String, profileId: String) async {
        isLoading = true
        error = nil

        do {
            let request = StartSessionRequest(
                contentId: contentId,
                profileId: profileId
            )
            activeSession = try await apiClient.post(
                "/bilingual-dubbing/session/start",
                body: request,
                as: BilingualSession.self
            )
            isActive = true
            logger.info("Session started", context: [
                "sessionId": activeSession?.sessionId ?? ""
            ])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to start session", error: error)
        }

        isLoading = false
    }

    // MARK: - End Session

    func endSession() async {
        guard let session = activeSession else { return }
        isLoading = true
        error = nil

        do {
            _ = try await apiClient.post(
                "/bilingual-dubbing/session/\(session.sessionId)/end",
                body: EmptyBody(),
                as: BilingualSession.self
            )
            logger.info("Session ended", context: ["sessionId": session.sessionId])
            activeSession = nil
            isActive = false
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to end session", error: error)
        }

        isLoading = false
    }

    // MARK: - Translate Segment

    func translateSegment(
        sessionId: String,
        hebrewText: String,
        timestampSeconds: Double
    ) async {
        do {
            let request = TranslateSegmentRequest(
                sessionId: sessionId,
                hebrewText: hebrewText,
                timestampSeconds: timestampSeconds
            )
            let result = try await apiClient.post(
                "/bilingual-dubbing/session/translate",
                body: request,
                as: BilingualSession.self
            )
            if activeSession != nil {
                activeSession = result
            }
        } catch {
            logger.error("Failed to translate segment", error: error, context: [
                "sessionId": sessionId
            ])
        }
    }

    // MARK: - Cleanup

    func cleanup() async {
        if isActive {
            await endSession()
        }
    }
}

/// Empty body for POST requests that require no payload
private struct EmptyBody: Encodable, Sendable {}
