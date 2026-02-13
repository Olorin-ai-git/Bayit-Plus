import BayitNetworking
import Foundation

/// Repository protocol for household management API operations.
protocol HouseholdRepository: Sendable {
    func fetchHousehold() async throws -> Household
    func createHousehold(name: String) async throws -> Household
    func inviteMember(householdId: String, email: String, role: String) async throws
    func removeMember(householdId: String, userId: String) async throws
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

    func createHousehold(name: String) async throws -> Household {
        struct CreateRequest: Encodable, Sendable {
            let name: String
        }
        return try await client.post(
            "/api/v1/household/create",
            body: CreateRequest(name: name),
            as: Household.self
        )
    }

    func inviteMember(householdId: String, email: String, role: String) async throws {
        struct InviteRequest: Encodable, Sendable {
            let email: String
            let role: String
        }
        struct InviteResponse: Decodable, Sendable {
            let invitationId: String
            let expiresAt: String
        }
        _ = try await client.post(
            "/api/v1/household/\(householdId)/invite",
            body: InviteRequest(email: email, role: role),
            as: InviteResponse.self
        )
    }

    func removeMember(householdId: String, userId: String) async throws {
        _ = try await client.delete(
            "/api/v1/household/\(householdId)/members/\(userId)",
            as: MessageResponse.self
        )
    }
}
