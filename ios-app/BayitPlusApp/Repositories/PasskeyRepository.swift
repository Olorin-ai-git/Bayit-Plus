import BayitNetworking
import Foundation

/// Repository protocol for passkey registration, authentication, and credential management.
protocol PasskeyRepository: Sendable {
    func registerOptions(deviceName: String) async throws -> PasskeyRegistrationOptions
    func registerVerify(credential: String, deviceName: String) async throws -> PasskeyCredential
    func authenticateOptions() async throws -> PasskeyRegistrationOptions
    func authenticateVerify(credential: String, challengeId: String) async throws
    func listCredentials() async throws -> [PasskeyCredential]
    func deleteCredential(id: String) async throws
}

/// Production implementation of `PasskeyRepository` using `APIClient`.
final class APIPasskeyRepository: PasskeyRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func registerOptions(deviceName: String) async throws -> PasskeyRegistrationOptions {
        let queryItems = [URLQueryItem(name: "device_name", value: deviceName)]
        return try await client.post(
            "/api/v1/passkeys/register/options",
            body: EmptyBody(),
            queryItems: queryItems,
            as: PasskeyRegistrationOptions.self
        )
    }

    func registerVerify(credential: String, deviceName: String) async throws -> PasskeyCredential {
        struct VerifyRequest: Encodable, Sendable {
            let credential: String
            let deviceName: String
        }
        return try await client.post(
            "/api/v1/passkeys/register/verify",
            body: VerifyRequest(credential: credential, deviceName: deviceName),
            as: PasskeyCredential.self
        )
    }

    func authenticateOptions() async throws -> PasskeyRegistrationOptions {
        return try await client.post(
            "/api/v1/passkeys/authenticate/options",
            body: EmptyBody(),
            as: PasskeyRegistrationOptions.self
        )
    }

    func authenticateVerify(credential: String, challengeId: String) async throws {
        struct VerifyRequest: Encodable, Sendable {
            let credential: String
            let challengeId: String
        }
        _ = try await client.post(
            "/api/v1/passkeys/authenticate/verify",
            body: VerifyRequest(credential: credential, challengeId: challengeId),
            as: MessageResponse.self
        )
    }

    func listCredentials() async throws -> [PasskeyCredential] {
        return try await client.get(
            "/api/v1/passkeys/credentials",
            as: [PasskeyCredential].self
        )
    }

    func deleteCredential(id: String) async throws {
        _ = try await client.delete(
            "/api/v1/passkeys/credentials/\(id)",
            as: MessageResponse.self
        )
    }
}
