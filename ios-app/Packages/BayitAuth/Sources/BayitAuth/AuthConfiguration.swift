import Foundation

/// Protocol defining all configurable values for the auth layer.
///
/// No defaults are provided -- the host app MUST supply every value
/// from its configuration system (Info.plist, environment, xcconfig).
public protocol AuthConfiguration: Sendable {

    /// Google OAuth client ID from Firebase/Google Cloud Console.
    var googleClientID: String { get }

    /// The app's bundle identifier, used for Apple Sign-In and Keychain grouping.
    var bundleID: String { get }

    /// Service identifier for Keychain operations.
    /// Typically matches the bundle ID or a dedicated Keychain access group.
    var keychainServiceName: String { get }

    /// Keychain access group for shared Keychain access across app extensions.
    /// If `nil`, the default app Keychain is used.
    var keychainAccessGroup: String? { get }
}

/// Resolves auth configuration from Info.plist and environment.
///
/// Fails fast if required values are missing -- no silent defaults
/// for security-critical configuration.
public struct AppAuthConfiguration: AuthConfiguration, Sendable {
    public let googleClientID: String
    public let bundleID: String
    public let keychainServiceName: String
    public let keychainAccessGroup: String?

    public init() {
        let info = Bundle.main.infoDictionary ?? [:]

        guard let clientID = info["GOOGLE_CLIENT_ID"] as? String
            ?? ProcessInfo.processInfo.environment["GOOGLE_CLIENT_ID"],
              !clientID.isEmpty else {
            fatalError("Missing required GOOGLE_CLIENT_ID in Info.plist or environment")
        }

        guard let bundle = Bundle.main.bundleIdentifier,
              !bundle.isEmpty else {
            fatalError("Unable to resolve bundle identifier")
        }

        let keychainService = info["KEYCHAIN_SERVICE_NAME"] as? String
            ?? ProcessInfo.processInfo.environment["KEYCHAIN_SERVICE_NAME"]
            ?? bundle

        let accessGroup = info["KEYCHAIN_ACCESS_GROUP"] as? String
            ?? ProcessInfo.processInfo.environment["KEYCHAIN_ACCESS_GROUP"]

        self.googleClientID = clientID
        self.bundleID = bundle
        self.keychainServiceName = keychainService
        self.keychainAccessGroup = accessGroup
    }

    /// Creates a configuration with explicit values for dependency injection.
    public init(
        googleClientID: String,
        bundleID: String,
        keychainServiceName: String,
        keychainAccessGroup: String? = nil
    ) {
        self.googleClientID = googleClientID
        self.bundleID = bundleID
        self.keychainServiceName = keychainServiceName
        self.keychainAccessGroup = keychainAccessGroup
    }
}
