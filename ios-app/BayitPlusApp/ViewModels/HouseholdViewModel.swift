import Foundation
import Observation

/// ViewModel for household management - fetch household info,
/// add/remove members.
@Observable
final class HouseholdViewModel {
    private(set) var household: Household?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isAddingMember = false

    var newMemberUserId = ""

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

        do {
            household = try await repository.fetchHousehold()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Member Management

    @MainActor
    func addMember() async {
        let userId = newMemberUserId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !userId.isEmpty else { return }

        isAddingMember = true
        error = nil

        do {
            let request = HouseholdAddMemberRequest(userId: userId)
            _ = try await repository.addMember(request)
            newMemberUserId = ""
            await load()
        } catch {
            self.error = error.localizedDescription
        }

        isAddingMember = false
    }

    @MainActor
    func removeMember(_ member: HouseholdMember) async {
        guard let userId = member.userId else { return }
        error = nil

        do {
            try await repository.removeMember(userId: userId)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Computed

    var memberCount: Int {
        household?.members?.count ?? 0
    }

    var maxProfiles: Int {
        household?.maxProfiles ?? 0
    }

    func isOwner(_ member: HouseholdMember) -> Bool {
        member.userId == household?.ownerId
    }
}
