import BayitCore
import Foundation
import Observation

/// Represents a pending chess game invite received from another player.
struct PendingChessInvite: Sendable, Equatable {
    let gameCode: String
    let inviterName: String
    let inviterId: String
    let timeControl: Int?
}

/// ViewModel that polls for incoming chess invites and handles accept/decline actions.
@MainActor
@Observable
final class ChessInviteViewModel {
    var pendingInvite: PendingChessInvite?
    var acceptedGame: ChessGame?
    private var pollTask: Task<Void, Never>?

    private let repository: any ChessRepository
    private let logger = BayitLogger(category: "ChessInvite")

    init(repository: any ChessRepository) {
        self.repository = repository
    }

    /// Begin polling for pending invites every 15 seconds.
    func startPolling() {
        stopPolling()
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.fetchPendingInvites()
                try? await Task.sleep(nanoseconds: 15_000_000_000)
            }
        }
    }

    /// Stop the invite polling loop.
    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    /// Accept a pending invite by joining the game via its code.
    func acceptInvite(gameCode: String) async {
        do {
            let game = try await repository.joinGame(gameCode: gameCode)
            pendingInvite = nil
            acceptedGame = game
            logger.info("Invite accepted", context: ["gameCode": gameCode])
        } catch {
            logger.error("Accept invite failed", error: error)
        }
    }

    /// Decline a pending invite, notifying the backend.
    func declineInvite(gameCode: String) async {
        do {
            try await repository.declineInvite(gameCode: gameCode)
            pendingInvite = nil
            logger.info("Invite declined", context: ["gameCode": gameCode])
        } catch {
            logger.error("Decline invite failed", error: error)
        }
    }

    // MARK: - Private

    private func fetchPendingInvites() async {
        do {
            let games = try await repository.getPendingInvites()
            if let first = games.first {
                let host = first.whitePlayer ?? first.blackPlayer
                pendingInvite = PendingChessInvite(
                    gameCode: first.gameCode,
                    inviterName: host?.userName ?? "",
                    inviterId: host?.userId ?? "",
                    timeControl: first.timeControl
                )
            } else {
                pendingInvite = nil
            }
        } catch {
            logger.error("Fetch pending invites failed", error: error)
        }
    }
}
