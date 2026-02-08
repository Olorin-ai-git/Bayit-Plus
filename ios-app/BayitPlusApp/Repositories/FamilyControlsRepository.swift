import BayitNetworking
import Foundation

/// Repository protocol for family controls and parental PIN API operations.
protocol FamilyControlsRepository: Sendable {
    func setPin(_ request: FamilyPinRequest) async throws
    func verifyPin(_ request: FamilyPinRequest) async throws -> FamilyPinVerifyResponse
    func fetchPreferences() async throws -> FamilyControlsPreferences
    func updatePreferences(_ update: FamilyControlsPreferencesUpdate) async throws -> FamilyControlsPreferences
}

/// Production implementation of `FamilyControlsRepository` using `APIClient`.
final class APIFamilyControlsRepository: FamilyControlsRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func setPin(_ request: FamilyPinRequest) async throws {
        _ = try await client.post(
            "/api/v1/family-controls/pin",
            body: request,
            as: MessageResponse.self
        )
    }

    func verifyPin(_ request: FamilyPinRequest) async throws -> FamilyPinVerifyResponse {
        return try await client.post(
            "/api/v1/family-controls/verify",
            body: request,
            as: FamilyPinVerifyResponse.self
        )
    }

    func fetchPreferences() async throws -> FamilyControlsPreferences {
        return try await client.get(
            "/api/v1/family-controls/preferences",
            as: FamilyControlsPreferences.self
        )
    }

    func updatePreferences(
        _ update: FamilyControlsPreferencesUpdate
    ) async throws -> FamilyControlsPreferences {
        return try await client.put(
            "/api/v1/family-controls/preferences",
            body: update,
            as: FamilyControlsPreferences.self
        )
    }
}
