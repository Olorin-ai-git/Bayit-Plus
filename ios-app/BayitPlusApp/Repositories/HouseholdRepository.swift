import BayitNetworking
import Foundation

/// Repository protocol for household management API operations.
protocol HouseholdRepository: Sendable {
    func fetchHousehold() async throws -> Household
    func addMember(_ request: HouseholdAddMemberRequest) async throws -> HouseholdMember
    func removeMember(userId: String) async throws
}

/// Production implementation of `HouseholdRepository` using `APIClient`.
final class APIHouseholdRepository: HouseholdRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchHousehold() async throws -> Household {
        return try await client.get(
            "/api/v1/household",
            as: Household.self
        )
    }

    func addMember(_ request: HouseholdAddMemberRequest) async throws -> HouseholdMember {
        return try await client.post(
            "/api/v1/household/members",
            body: request,
            as: HouseholdMember.self
        )
    }

    func removeMember(userId: String) async throws {
        _ = try await client.delete(
            "/api/v1/household/members/\(userId)",
            as: MessageResponse.self
        )
    }
}
