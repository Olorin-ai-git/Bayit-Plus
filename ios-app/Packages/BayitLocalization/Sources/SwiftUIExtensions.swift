import SwiftUI

// MARK: - Environment Key

private struct LocalizationManagerKey: EnvironmentKey {
    static let defaultValue: LocalizationManager? = nil
}

public extension EnvironmentValues {
    /// The shared `LocalizationManager` for the current view hierarchy.
    var localizationManager: LocalizationManager? {
        get { self[LocalizationManagerKey.self] }
        set { self[LocalizationManagerKey.self] = newValue }
    }
}

// MARK: - View Modifier

public extension View {
    /// Injects the `LocalizationManager` into the environment and
    /// applies the correct layout direction for the active language.
    func bayitLocalization(_ manager: LocalizationManager) -> some View {
        self
            .environment(\.localizationManager, manager)
            .environment(\.layoutDirection, manager.layoutDirection)
            .environment(\.locale, manager.locale)
    }
}

// MARK: - Localized Text Initializer

public extension Text {
    /// Creates a `Text` view displaying the localized string for `key`.
    ///
    /// Requires a `LocalizationManager` in the call site because `Text`
    /// initializers cannot read the SwiftUI environment. Pass the manager
    /// explicitly or use `LocalizedText` instead.
    ///
    /// Example:
    /// ```swift
    /// Text.localized("account.title", manager: localization)
    /// ```
    static func localized(
        _ key: String,
        manager: LocalizationManager
    ) -> Text {
        Text(manager.t(key))
    }

    /// Creates a `Text` view with interpolated localized content.
    static func localized(
        _ key: String,
        args: [String: String],
        manager: LocalizationManager
    ) -> Text {
        Text(manager.t(key, args))
    }
}

// MARK: - LocalizedText View

/// A convenience view that reads the `LocalizationManager` from the
/// SwiftUI environment and renders the translation for a given key.
///
/// Usage:
/// ```swift
/// LocalizedText("account.title")
/// LocalizedText("admin.plans.trialDays", args: ["days": "14"])
/// ```
public struct LocalizedText: View {
    @Environment(\.localizationManager) private var manager

    private let key: String
    private let args: [String: String]?

    public init(_ key: String) {
        self.key = key
        self.args = nil
    }

    public init(_ key: String, args: [String: String]) {
        self.key = key
        self.args = args
    }

    public var body: some View {
        if let manager {
            if let args {
                Text(manager.t(key, args))
            } else {
                Text(manager.t(key))
            }
        } else {
            Text(key)
        }
    }
}
