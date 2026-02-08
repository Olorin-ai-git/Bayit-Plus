import Foundation

// MARK: - Device Pairing

/// A paired device for cross-device playback sync.
struct PairedDevice: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let type: String?
    let platform: String?
    let lastSynced: String?
}

/// Request body for POST /api/v1/devices/pair
struct PairingRequest: Encodable, Sendable {
    let deviceName: String
    let deviceType: String
}

/// A pairing code for device-to-device linking.
struct PairingCode: Decodable, Sendable {
    let code: String?
    let expiresAt: String?
}
