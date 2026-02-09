import BayitAuth
import Foundation

/// Auth configuration for the tvOS app target.
/// Resolves values from Info.plist and environment, same as iOS.
struct TVAppAuthConfiguration: AuthConfiguration, Sendable {
    let googleClientID: String
    let googleServerClientID: String
    let bundleID: String
    let keychainServiceName: String
    let keychainAccessGroup: String?

    init() {
        let info = Bundle.main.infoDictionary ?? [:]

        guard let clientID = info["GOOGLE_CLIENT_ID"] as? String
            ?? ProcessInfo.processInfo.environment["GOOGLE_CLIENT_ID"],
              !clientID.isEmpty else {
            fatalError("Missing required GOOGLE_CLIENT_ID in Info.plist or environment")
        }

        guard let serverClientID = info["GOOGLE_SERVER_CLIENT_ID"] as? String
            ?? ProcessInfo.processInfo.environment["GOOGLE_SERVER_CLIENT_ID"],
              !serverClientID.isEmpty else {
            fatalError("Missing required GOOGLE_SERVER_CLIENT_ID in Info.plist or environment")
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
        self.googleServerClientID = serverClientID
        self.bundleID = bundle
        self.keychainServiceName = keychainService
        self.keychainAccessGroup = accessGroup
    }
}
