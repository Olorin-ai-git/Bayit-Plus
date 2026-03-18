#if os(tvOS)
    import BayitCore
    import BayitNetworking
    import Foundation

    enum AvatarPairingStatus: Equatable {
        case loading
        case showingQR
        case phoneConnected
        case creating
        case completed(avatarId: String)
        case expired
        case error(String)
    }

    @MainActor
    @Observable
    final class TVAvatarPairingViewModel {
        var status: AvatarPairingStatus = .loading
        var qrCodeData: String?
        var pairingCode: String?
        var sessionId: String?

        private let apiClient: APIClient
        private let profileId: String
        private let logger = BayitLogger(category: "TVAvatarPairing")
        private let config = AppConfiguration()
        @ObservationIgnored nonisolated(unsafe) var pollingTask: Task<Void, Never>?

        struct StartResponse: Decodable {
            let sessionId: String
            let pairingCode: String
            let qrUrl: String
            let expiresAt: String

            private enum CodingKeys: String, CodingKey {
                case sessionId = "session_id"
                case pairingCode = "pairing_code"
                case qrUrl = "qr_url"
                case expiresAt = "expires_at"
            }
        }

        struct PollResponse: Decodable {
            let status: String
            let createdAvatarId: String?

            private enum CodingKeys: String, CodingKey {
                case status
                case createdAvatarId = "created_avatar_id"
            }
        }

        init(apiClient: APIClient, profileId: String) {
            self.apiClient = apiClient
            self.profileId = profileId
        }

        deinit { pollingTask?.cancel() }

        func startSession() async {
            status = .loading
            do {
                let response = try await apiClient.post(
                    "zeh-ani/avatar/pairing/start",
                    body: ["profile_id": profileId],
                    as: StartResponse.self
                )
                sessionId = response.sessionId
                qrCodeData = response.qrUrl
                pairingCode = response.pairingCode
                status = .showingQR
                logger.info("Pairing session started: \(response.sessionId)")
                startPolling()
            } catch {
                status = .error(error.localizedDescription)
                logger.error("Failed to start pairing session", error: error)
            }
        }

        func retry() async {
            cleanup()
            await startSession()
        }

        nonisolated func cleanup() {
            pollingTask?.cancel()
            pollingTask = nil
        }

        private func startPolling() {
            pollingTask?.cancel()
            pollingTask = Task { [weak self] in
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(3))
                    guard !Task.isCancelled else { break }
                    await self?.pollStatus()
                }
            }
        }

        private func pollStatus() async {
            guard let sessionId else { return }
            do {
                let response = try await apiClient.get(
                    "zeh-ani/avatar/pairing/\(sessionId)/status",
                    as: PollResponse.self
                )
                switch response.status {
                case "scanned":
                    if status != .phoneConnected { status = .phoneConnected }
                case "creating":
                    if status != .creating { status = .creating }
                case "completed":
                    let avatarId = response.createdAvatarId ?? ""
                    status = .completed(avatarId: avatarId)
                    cleanup()
                case "expired":
                    status = .expired
                    cleanup()
                default:
                    break
                }
            } catch {
                logger.error("Pairing poll failed", error: error)
            }
        }
    }
#endif
