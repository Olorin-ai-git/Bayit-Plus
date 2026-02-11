import BayitCore
import BayitNetworking
import Foundation
import Observation

/// ViewModel for Watch Parties -- handles REST operations and WebSocket real-time messaging.
@MainActor
@Observable
final class WatchPartyViewModel {
    var activeParty: WatchParty?
    var myParties: [WatchParty] = []
    var chatMessages: [PartyChatMessage] = []
    var participants: [ParticipantState] = []
    var isLoading = false
    var isConnected = false
    var error: String?

    var showCreateSheet = false
    var showJoinSheet = false

    let repository: any WatchPartyRepository
    let logger = BayitLogger(category: "WatchParty")
    var connection: WebSocketConnection?
    var receiveTask: Task<Void, Never>?
    var webSocketManager: WebSocketManager?
    var currentUserId: String?

    init(repository: any WatchPartyRepository) {
        self.repository = repository
    }

    // MARK: - REST Operations

    @MainActor
    func loadMyParties() async {
        isLoading = true
        error = nil
        do {
            myParties = try await repository.fetchMyParties()
            logger.info("Parties loaded", context: ["count": String(myParties.count)])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to load parties", error: error)
        }
        isLoading = false
    }

    @MainActor
    func createParty(_ request: CreatePartyRequest) async {
        do {
            let party = try await repository.createParty(request)
            activeParty = party
            participants = party.participants
            showCreateSheet = false
            logger.info("Party created", context: [
                "partyId": party.id, "roomCode": party.roomCode
            ])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to create party", error: error)
        }
    }

    @MainActor
    func joinParty(roomCode: String) async {
        do {
            let party = try await repository.joinParty(roomCode: roomCode)
            activeParty = party
            participants = party.participants
            showJoinSheet = false
            logger.info("Joined party", context: ["partyId": party.id])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to join party", error: error)
        }
    }

    @MainActor
    func leaveParty() async {
        guard let partyId = activeParty?.id else { return }
        do {
            try await repository.leaveParty(partyId: partyId)
            disconnectWebSocket()
            activeParty = nil
            chatMessages = []
            participants = []
            logger.info("Left party", context: ["partyId": partyId])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to leave party", error: error)
        }
    }

    @MainActor
    func sendChat(_ message: String) async {
        guard let partyId = activeParty?.id else { return }
        do {
            try await repository.sendChat(
                PartyChatRequest(partyId: partyId, message: message)
            )
        } catch {
            logger.error("Failed to send chat", error: error)
        }
    }

    @MainActor
    func syncPlayback(position: Double, isPlaying: Bool) async {
        guard let partyId = activeParty?.id else { return }
        do {
            try await repository.syncPlayback(
                PlaybackSyncRequest(
                    partyId: partyId, position: position, isPlaying: isPlaying
                )
            )
        } catch {
            logger.error("Failed to sync playback", error: error)
        }
    }
}
