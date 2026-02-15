import BayitNetworking
import Foundation
import Observation

/// ViewModel for household management - fetch household info,
/// invite members, or create a new household.
@MainActor
@Observable
final class HouseholdViewModel {
    private(set) var household: Household?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var noHousehold = false
    private(set) var isCreating = false
    private(set) var isInviting = false
    private(set) var inviteSent = false

    var newHouseholdName = ""
    var inviteEmail = ""
    var inviteRole = "child"

    private let repository: any HouseholdRepository

    init(repository: any HouseholdRepository) {
        self.repository = repository
    }

    // MARK: - Data Loading

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        noHousehold = false

        do {
            household = try await repository.fetchHousehold()
        } catch let apiError as APIError {
            if case .notFound = apiError {
                noHousehold = true
            } else {
                self.error = apiError.localizedDescription
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    // MARK: - Household Creation

    @MainActor
    func createHousehold() async {
        let name = newHouseholdName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        isCreating = true
        error = nil

        do {
            household = try await repository.createHousehold(name: name)
            noHousehold = false
            newHouseholdName = ""
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isCreating = false
    }

    // MARK: - Member Management

    @MainActor
    func inviteMember() async {
        let email = inviteEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !email.isEmpty, let householdId = household?.householdId else { return }

        isInviting = true
        error = nil
        inviteSent = false

        do {
            try await repository.inviteMember(
                householdId: householdId, email: email, role: inviteRole
            )
            inviteEmail = ""
            inviteRole = "child"
            inviteSent = true
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isInviting = false
    }

    @MainActor
    func removeMember(_ member: HouseholdMember) async {
        guard let userId = member.userId,
              let householdId = household?.householdId else { return }
        error = nil

        do {
            try await repository.removeMember(
                householdId: householdId, userId: userId
            )
            await load()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
    }

    // MARK: - Computed

    var memberCount: Int {
        household?.members?.count ?? 0
    }

    var maxProfiles: Int {
        household?.maxProfiles ?? 5
    }

    func isOwner(_ member: HouseholdMember) -> Bool {
        member.userId == household?.ownerId
    }
}
