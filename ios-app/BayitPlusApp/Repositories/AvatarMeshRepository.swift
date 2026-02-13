import BayitNetworking
import Foundation

protocol AvatarMeshRepository: Sendable {

    func generateMesh(
        avatarId: String,
        profileId: String,
        pin: String
    ) async throws -> AvatarMeshStatus

    func fetchMeshStatus(
        avatarId: String
    ) async throws -> AvatarMeshStatus

    func fetchGlbUrl(
        avatarId: String
    ) async throws -> MeshGlbUrl

    func grantBiometricConsent(
        profileId: String,
        consentType: String,
        pin: String
    ) async throws -> [String: Any]

    func checkBiometricConsent(
        profileId: String
    ) async throws -> BiometricConsentStatus

    func revokeBiometricConsent(
        profileId: String,
        consentType: String
    ) async throws -> Bool

    func getMagicMirrorGreeting(
        profileId: String
    ) async throws -> MagicMirrorGreeting

    func getMeshGlbUrl(
        avatarId: String
    ) async throws -> MeshGlbUrl
}

final class APIAvatarMeshRepository: AvatarMeshRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func generateMesh(
        avatarId: String,
        profileId: String,
        pin: String
    ) async throws -> AvatarMeshStatus {
        let body: [String: Any] = [
            "avatar_id": avatarId,
            "profile_id": profileId,
            "pin": pin,
        ]
        return try await client.postJSON(
            "/api/v1/zeh-ani/mesh/generate",
            body: body,
            as: AvatarMeshStatus.self
        )
    }

    func fetchMeshStatus(
        avatarId: String
    ) async throws -> AvatarMeshStatus {
        return try await client.get(
            "/api/v1/zeh-ani/mesh/\(avatarId)",
            as: AvatarMeshStatus.self
        )
    }

    func fetchGlbUrl(
        avatarId: String
    ) async throws -> MeshGlbUrl {
        return try await client.get(
            "/api/v1/zeh-ani/mesh/\(avatarId)/glb",
            as: MeshGlbUrl.self
        )
    }

    func grantBiometricConsent(
        profileId: String,
        consentType: String,
        pin: String
    ) async throws -> [String: Any] {
        let body: [String: String] = [
            "profile_id": profileId,
            "consent_type": consentType,
            "pin": pin,
        ]
        struct BiometricConsentResponse: Decodable {
            let id: String
            let consentType: String
            let active: Bool
            let grantedAt: String
            let onDeviceOnly: Bool
        }
        let response = try await client.post(
            "/api/v1/zeh-ani/consent/biometric",
            body: body,
            as: BiometricConsentResponse.self
        )
        return [
            "id": response.id,
            "consent_type": response.consentType,
            "active": response.active,
            "granted_at": response.grantedAt,
            "on_device_only": response.onDeviceOnly
        ]
    }

    func checkBiometricConsent(
        profileId: String
    ) async throws -> BiometricConsentStatus {
        return try await client.get(
            "/api/v1/zeh-ani/consent/biometric/\(profileId)",
            as: BiometricConsentStatus.self
        )
    }

    func revokeBiometricConsent(
        profileId: String,
        consentType: String
    ) async throws -> Bool {
        struct RevokeConsentResponse: Decodable {
            let profileId: String
            let consentType: String
            let revoked: Bool
        }
        let response = try await client.delete(
            "/api/v1/zeh-ani/consent/biometric/\(profileId)?consent_type=\(consentType)",
            as: RevokeConsentResponse.self
        )
        return response.revoked
    }

    func getMagicMirrorGreeting(
        profileId: String
    ) async throws -> MagicMirrorGreeting {
        return try await client.get(
            "/api/v1/zeh-ani/magic-mirror/\(profileId)",
            as: MagicMirrorGreeting.self
        )
    }

    func getMeshGlbUrl(
        avatarId: String
    ) async throws -> MeshGlbUrl {
        return try await client.get(
            "/api/v1/zeh-ani/avatar-mesh/\(avatarId)",
            as: MeshGlbUrl.self
        )
    }
}
