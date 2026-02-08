import BayitNetworking
import Foundation

/// Repository protocol for device pairing code generation and management API operations.
protocol DevicePairingRepository: Sendable {
    func generateCode() async throws -> PairingCode
    func verifyCode(code: String) async throws -> PairedDevice
    func listDevices() async throws -> [PairedDevice]
    func removeDevice(id: String) async throws
}

/// Production implementation of `DevicePairingRepository` using `APIClient`.
final class APIDevicePairingRepository: DevicePairingRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func generateCode() async throws -> PairingCode {
        return try await client.post(
            "/api/v1/pairing/code",
            body: EmptyBody(),
            as: PairingCode.self
        )
    }

    func verifyCode(code: String) async throws -> PairedDevice {
        struct VerifyRequest: Encodable, Sendable {
            let code: String
        }
        return try await client.post(
            "/api/v1/pairing/verify",
            body: VerifyRequest(code: code),
            as: PairedDevice.self
        )
    }

    func listDevices() async throws -> [PairedDevice] {
        return try await client.get(
            "/api/v1/pairing/devices",
            as: [PairedDevice].self
        )
    }

    func removeDevice(id: String) async throws {
        _ = try await client.delete(
            "/api/v1/pairing/devices/\(id)",
            as: MessageResponse.self
        )
    }
}
