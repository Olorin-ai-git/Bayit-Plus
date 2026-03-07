#if os(tvOS)
    import BayitCore
    import Combine
    import Foundation
    import GroupActivities
    import Observation

    /// Manages the GroupSession lifecycle for SharePlay on tvOS.
    /// Handles session preparation, joining, leaving, and participant tracking.
    @MainActor
    @Observable
    final class TVSharePlayService {
        // MARK: - State

        private(set) var isActive = false
        private(set) var participantCount = 0
        private(set) var participantNames: [String] = []
        internal(set) var isSynced = true
        private(set) var sessionError: String?

        // MARK: - Internal

        var groupSession: GroupSession<BayitWatchActivity>?
        var messenger: GroupSessionMessenger?
        private var subscriptions = Set<AnyCancellable>()
        private var sessionTask: Task<Void, Never>?
        private let logger = BayitLogger(category: "TVSharePlay")

        // MARK: - Callbacks

        var onPlaybackSync: ((SharePlayPlaybackMessage) -> Void)?
        var onContentChange: ((SharePlayContentMessage) -> Void)?

        init() {}

        // MARK: - Start Activity

        func startActivity(
            contentId: String,
            contentType: String,
            contentTitle: String
        ) async {
            let activity = BayitWatchActivity(
                contentId: contentId,
                contentType: contentType,
                contentTitle: contentTitle
            )

            do {
                let activated = try await activity.activate()
                logger.info("SharePlay activity activated: \(activated)")
            } catch {
                logger.error("SharePlay activation failed: \(error)")
                sessionError = error.localizedDescription
            }

            listenForSessions()
        }

        // MARK: - Session Listening

        func listenForSessions() {
            sessionTask?.cancel()
            sessionTask = Task {
                for await session in BayitWatchActivity.sessions() {
                    await configureSession(session)
                }
            }
        }

        func configureSession(_ session: GroupSession<BayitWatchActivity>) async {
            cleanupCurrentSession()

            groupSession = session
            messenger = GroupSessionMessenger(session: session)

            session.$state
                .receive(on: DispatchQueue.main)
                .sink { [weak self] sessionState in
                    guard let self else { return }
                    switch sessionState {
                    case .joined:
                        self.isActive = true
                        self.sessionError = nil
                    case .invalidated:
                        self.isActive = false
                        self.cleanupCurrentSession()
                    default:
                        break
                    }
                }
                .store(in: &subscriptions)

            session.$activeParticipants
                .receive(on: DispatchQueue.main)
                .sink { [weak self] participants in
                    guard let self else { return }
                    self.participantCount = participants.count
                }
                .store(in: &subscriptions)

            session.join()
            startReceivingMessages()
        }

        // MARK: - Leave / End

        func leaveSession() async {
            groupSession?.leave()
            cleanupCurrentSession()
        }

        func endSession() async {
            groupSession?.end()
            cleanupCurrentSession()
        }

        private func cleanupCurrentSession() {
            subscriptions.removeAll()
            messenger = nil
            groupSession = nil
            isActive = false
            participantCount = 0
            participantNames = []
            isSynced = true
        }

        // MARK: - Message Receiving

        private func startReceivingMessages() {
            guard let messenger else { return }

            Task {
                for await (message, _) in messenger.messages(of: SharePlayPlaybackMessage.self) {
                    await MainActor.run {
                        self.isSynced = true
                        self.onPlaybackSync?(message)
                    }
                }
            }

            Task {
                for await (message, _) in messenger.messages(of: SharePlayContentMessage.self) {
                    await MainActor.run {
                        self.onContentChange?(message)
                    }
                }
            }
        }
    }
#endif
