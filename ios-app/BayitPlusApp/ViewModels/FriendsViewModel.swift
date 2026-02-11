import BayitCore
import Foundation
import Observation

/// ViewModel for the Friends screen -- manages friend list, requests, and user search.
@MainActor
@Observable
final class FriendsViewModel {
    private(set) var friends: [Friend] = []
    private(set) var incomingRequests: [FriendRequest] = []
    private(set) var outgoingRequests: [FriendRequest] = []
    private(set) var searchResults: [UserSearchResult] = []
    private(set) var isLoading = false
    private(set) var isSearching = false
    private(set) var error: String?

    var searchQuery = ""

    private let repository: any FriendsRepository
    private let logger = BayitLogger(category: "Friends")
    private let searchLimit = 20

    init(repository: any FriendsRepository) {
        self.repository = repository
    }

    // MARK: - Load Data

    @MainActor
    func loadFriends() async {
        isLoading = true
        error = nil

        do {
            friends = try await repository.fetchFriends()
            logger.info("Friends loaded", context: ["count": String(friends.count)])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to load friends", error: error)
        }

        isLoading = false
    }

    @MainActor
    func loadRequests() async {
        do {
            let response = try await repository.fetchRequests()
            incomingRequests = response.incoming
            outgoingRequests = response.outgoing
            logger.info("Requests loaded", context: [
                "incoming": String(response.incoming.count),
                "outgoing": String(response.outgoing.count)
            ])
        } catch {
            logger.error("Failed to load requests", error: error)
        }
    }

    @MainActor
    func loadAll() async {
        isLoading = true
        error = nil

        async let friendsResult: Void = loadFriendsOnly()
        async let requestsResult: Void = loadRequestsOnly()
        _ = await (friendsResult, requestsResult)

        isLoading = false
    }

    // MARK: - Actions

    @MainActor
    func sendRequest(to receiverId: String) async {
        do {
            try await repository.sendRequest(receiverId: receiverId)
            logger.info("Friend request sent", context: ["receiverId": receiverId])
            await loadRequests()
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to send friend request", error: error)
        }
    }

    @MainActor
    func acceptRequest(_ requestId: String) async {
        do {
            try await repository.acceptRequest(requestId: requestId)
            logger.info("Request accepted", context: ["requestId": requestId])
            await loadAll()
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to accept request", error: error)
        }
    }

    @MainActor
    func rejectRequest(_ requestId: String) async {
        do {
            try await repository.rejectRequest(requestId: requestId)
            logger.info("Request rejected", context: ["requestId": requestId])
            incomingRequests.removeAll { $0.id == requestId }
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to reject request", error: error)
        }
    }

    @MainActor
    func searchUsers() async {
        let trimmed = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            searchResults = []
            return
        }

        isSearching = true
        do {
            searchResults = try await repository.searchUsers(query: trimmed, limit: searchLimit)
            logger.info("User search completed", context: [
                "query": trimmed, "resultCount": String(searchResults.count)
            ])
        } catch {
            logger.error("User search failed", error: error)
        }
        isSearching = false
    }

    // MARK: - Private Helpers

    @MainActor
    private func loadFriendsOnly() async {
        do {
            friends = try await repository.fetchFriends()
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to load friends", error: error)
        }
    }

    @MainActor
    private func loadRequestsOnly() async {
        do {
            let response = try await repository.fetchRequests()
            incomingRequests = response.incoming
            outgoingRequests = response.outgoing
        } catch {
            logger.error("Failed to load requests", error: error)
        }
    }
}
