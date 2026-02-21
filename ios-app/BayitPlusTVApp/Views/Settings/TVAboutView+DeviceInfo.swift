import BayitDesignSystem
import SwiftUI

// MARK: - Computed Device & App Properties

extension TVAboutView {
    var appVersion: String {
        Bundle.main.object(
            forInfoDictionaryKey: "CFBundleShortVersionString"
        ) as? String ?? "1.0.0"
    }

    var buildNumber: String {
        Bundle.main.object(
            forInfoDictionaryKey: "CFBundleVersion"
        ) as? String ?? "1"
    }

    var deviceModel: String {
        var systemInfo = utsname()
        uname(&systemInfo)
        return withUnsafePointer(to: &systemInfo.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) {
                String(validatingUTF8: $0) ?? "Apple TV"
            }
        }
    }

    var osVersion: String {
        let os = ProcessInfo.processInfo.operatingSystemVersion
        return "tvOS \(os.majorVersion).\(os.minorVersion).\(os.patchVersion)"
    }
}
