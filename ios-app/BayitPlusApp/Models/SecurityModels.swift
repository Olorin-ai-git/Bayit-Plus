import Foundation

// MARK: - Security Settings

/// User security settings and feature toggles.
struct SecuritySettings: Decodable, Sendable {
    let twoFactorEnabled: Bool?
    let biometricEnabled: Bool?
    let lastPasswordChange: String?
    let loginNotifications: Bool?
}

/// A device connected to the user account.
struct ConnectedDevice: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let type: String?
    let lastActive: String?
    let isCurrent: Bool?
    let location: String?
    let platform: String?
}

/// A login history entry for security auditing.
struct LoginHistoryEntry: Decodable, Sendable, Identifiable {
    let id: String
    let device: String?
    let location: String?
    let timestamp: String?
    let success: Bool?
    let ipAddress: String?
}

/// Response from POST /api/v1/auth/2fa/setup
struct TwoFactorSetupResponse: Decodable, Sendable {
    let secret: String?
    let qrCode: String?
}

// MARK: - Passkeys

/// Response from GET /api/v1/auth/passkeys/register/options
struct PasskeyRegistrationOptions: Decodable, Sendable {
    let options: String?
    let challengeId: String?
}

/// A registered passkey credential.
struct PasskeyCredential: Decodable, Sendable, Identifiable {
    let id: String
    let deviceName: String?
    let createdAt: String?
    let lastUsedAt: String?
}

/// Request body for POST /api/v1/auth/change-password (extended)
struct PasswordChangeRequest: Encodable, Sendable {
    let currentPassword: String
    let newPassword: String
}
