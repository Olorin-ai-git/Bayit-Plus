import BayitNetworking
import Foundation

/// Repository protocol for family controls and parental PIN API operations.
protocol FamilyControlsRepository: Sendable {
    func setup(_ request: FamilyControlsSetupRequest) async throws
    func verifyPin(_ request: FamilyPinRequest) async throws -> FamilyPinVerifyResponse
    func fetchControls() async throws -> FamilyControlsPreferences
    func updateControls(_ update: FamilyControlsUpdateRequest) async throws -> FamilyControlsPreferences
}

/// Production implementation of `FamilyControlsRepository` using `APIClient`.
final class APIFamilyControlsRepository: FamilyControlsRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func setup(_ request: FamilyControlsSetupRequest) async throws {
        _ = try await client.post(
            "/api/v1/family/controls/setup",
            body: request,
            as: FamilyControlsWrappedResponse.self
        )
    }

    func verifyPin(_ request: FamilyPinRequest) async throws -> FamilyPinVerifyResponse {
        return try await client.post(
            "/api/v1/family/controls/verify-pin",
            body: request,
            as: FamilyPinVerifyResponse.self
        )
    }

    func fetchControls() async throws -> FamilyControlsPreferences {
        return try await client.get(
            "/api/v1/family/controls",
            as: FamilyControlsPreferences.self
        )
    }

    func updateControls(
        _ update: FamilyControlsUpdateRequest
    ) async throws -> FamilyControlsPreferences {
        let response = try await client.patch(
            "/api/v1/family/controls",
            body: update,
            as: FamilyControlsWrappedResponse.self
        )
        guard let controls = response.controls else {
            throw APIError.decodingError(underlying: "Missing controls in response")
        }
        return controls
    }
}
