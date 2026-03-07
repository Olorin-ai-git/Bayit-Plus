import BayitCore
import Foundation
import Observation

/// Monitors tvOS system user switching and manages per-user session state.
///
/// tvOS does not expose `TVUserManager` in the public SDK as of tvOS 17.
/// Instead, we detect user changes by monitoring app lifecycle events and
/// checking whether the stored user identifier has changed between sessions.
/// The OS user identifier is derived from the system account on the Apple TV.
@MainActor
@Observable
final class TVMultiUserService {
    private(set) var currentUserIdentifier: String?
    private(set) var didUserChange = false

    private let logger = BayitLogger(category: "TVMultiUser")
    private static let storedUserKey = "tv.bayit.plus.currentSystemUser"

    init() {
        currentUserIdentifier = UserDefaults.standard.string(
            forKey: Self.storedUserKey
        )
    }

    /// Called when the app enters the foreground (ScenePhase .active).
    /// Detects if the tvOS system user has changed by comparing stored identifier.
    func checkForUserChange() {
        let systemUser = resolveSystemUserIdentifier()

        guard let storedUser = currentUserIdentifier else {
            // First launch or no stored user -- store current
            currentUserIdentifier = systemUser
            persistUserIdentifier(systemUser)
            didUserChange = false
            logger.info("Initial user identity stored")
            return
        }

        if storedUser != systemUser {
            logger.info("System user change detected")
            currentUserIdentifier = systemUser
            persistUserIdentifier(systemUser)
            didUserChange = true
        } else {
            didUserChange = false
        }
    }

    /// Acknowledges the user change, resetting the flag.
    func acknowledgeUserChange() {
        didUserChange = false
    }

    /// Clears stored user state (used during sign-out).
    func clearUserState() {
        currentUserIdentifier = nil
        UserDefaults.standard.removeObject(forKey: Self.storedUserKey)
        didUserChange = false
        logger.info("User state cleared")
    }

    // MARK: - Private

    /// Resolves the current system user identifier.
    /// On tvOS, we use a combination of device identifier and user defaults
    /// domain to approximate multi-user detection. When tvOS introduces
    /// a public multi-user API, this method should be updated.
    private func resolveSystemUserIdentifier() -> String {
        // UserDefaults on tvOS are per-user when multiple users are configured.
        // We store a unique token per user domain. If this token is missing,
        // it means a different tvOS user is active.
        let domainKey = "tv.bayit.plus.userDomainToken"

        if let existing = UserDefaults.standard.string(forKey: domainKey) {
            return existing
        }

        let newToken = UUID().uuidString
        UserDefaults.standard.set(newToken, forKey: domainKey)
        return newToken
    }

    private func persistUserIdentifier(_ identifier: String) {
        UserDefaults.standard.set(identifier, forKey: Self.storedUserKey)
    }
}
