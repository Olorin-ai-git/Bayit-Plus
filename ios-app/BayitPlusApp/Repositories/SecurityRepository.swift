import BayitNetworking
import Foundation

/// Repository protocol for security settings, 2FA, devices, and biometric API operations.
protocol SecurityRepository: Sendable {
    func fetchSettings() async throws -> SecuritySettings
    func fetchDevices() async throws -> [ConnectedDevice]
    func fetchLoginHistory() async throws -> [LoginHistoryEntry]
    func enable2FA() async throws -> TwoFactorSetupResponse
    func disable2FA() async throws
    func verify2FA(code: String) async throws
    func changePassword(_ request: PasswordChangeRequest) async throws
    func removeDevice(id: String) async throws
    func signOutAll() async throws
    func enableBiometric() async throws
    func disableBiometric() async throws
    func sendSMS2FA() async throws
    func verifySMS2FA(code: String) async throws
}

/// Shared request body for MFA code verification endpoints.
private struct MFAVerifyRequest: Encodable, Sendable {
    let code: String
}

/// Production implementation of `SecurityRepository` using `APIClient`.
final class APISecurityRepository: SecurityRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchSettings() async throws -> SecuritySettings {
        return try await client.get(
            "/api/v1/auth/security/settings",
            as: SecuritySettings.self
        )
    }

    func fetchDevices() async throws -> [ConnectedDevice] {
        return try await client.get(
            "/api/v1/auth/devices",
            as: [ConnectedDevice].self
        )
    }

    func fetchLoginHistory() async throws -> [LoginHistoryEntry] {
        return try await client.get(
            "/api/v1/auth/login-history",
            as: [LoginHistoryEntry].self
        )
    }

    func enable2FA() async throws -> TwoFactorSetupResponse {
        return try await client.post(
            "/api/v1/auth/2fa/enable",
            body: EmptyBody(),
            as: TwoFactorSetupResponse.self
        )
    }

    func disable2FA() async throws {
        _ = try await client.post(
            "/api/v1/auth/2fa/disable",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    func verify2FA(code: String) async throws {
        _ = try await client.post(
            "/api/v1/auth/2fa/verify",
            body: MFAVerifyRequest(code: code),
            as: MessageResponse.self
        )
    }

    func changePassword(_ request: PasswordChangeRequest) async throws {
        _ = try await client.post(
            "/api/v1/auth/change-password",
            body: request,
            as: MessageResponse.self
        )
    }

    func removeDevice(id: String) async throws {
        _ = try await client.delete(
            "/api/v1/auth/devices/\(id)",
            as: MessageResponse.self
        )
    }

    func signOutAll() async throws {
        _ = try await client.post(
            "/api/v1/auth/sign-out-all",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    func enableBiometric() async throws {
        _ = try await client.post(
            "/api/v1/auth/biometric/enable",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    func disableBiometric() async throws {
        _ = try await client.post(
            "/api/v1/auth/biometric/disable",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    func sendSMS2FA() async throws {
        _ = try await client.post(
            "/api/v1/auth/2fa/sms/send",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    func verifySMS2FA(code: String) async throws {
        _ = try await client.post(
            "/api/v1/auth/2fa/sms/verify",
            body: MFAVerifyRequest(code: code),
            as: MessageResponse.self
        )
    }
}
