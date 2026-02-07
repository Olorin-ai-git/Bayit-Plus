import BayitCore
import Foundation
import SwiftUI

/// Central manager for Bayit+ localization state.
///
/// Uses iOS 17+ `@Observable` macro so SwiftUI views automatically
/// re-render when the language changes. Persists the user's language
/// choice in `UserDefaults`.
@Observable
public final class LocalizationManager {

    // MARK: - Configuration Keys

    private enum Keys {
        static let persistedLanguage = "tv.bayit.localization.selectedLanguage"
    }

    // MARK: - Notifications

    /// Posted when the active language changes. The `userInfo` dictionary
    /// contains the new `Language` under the `languageUserInfoKey` key.
    public static let languageDidChangeNotification = Notification.Name(
        "tv.bayit.localization.languageDidChange"
    )
    public static let languageUserInfoKey = "language"

    // MARK: - Properties

    private let logger = BayitLogger(category: "LocalizationManager")

    private let defaults: UserDefaults
    private let localeBundle: LocaleBundle

    /// The currently active language. Setting this value persists the
    /// choice, preloads the locale bundle, and posts a notification.
    public private(set) var currentLanguage: Language {
        didSet {
            guard currentLanguage != oldValue else { return }
            persist(currentLanguage)
            localeBundle.preload(currentLanguage)
            NotificationCenter.default.post(
                name: Self.languageDidChangeNotification,
                object: self,
                userInfo: [Self.languageUserInfoKey: currentLanguage]
            )
            logger.info("Language changed to \(self.currentLanguage.rawValue)")
        }
    }

    /// Layout direction derived from the current language.
    public var layoutDirection: LayoutDirection {
        currentLanguage.layoutDirection
    }

    /// Foundation `Locale` for the current language.
    public var locale: Locale {
        currentLanguage.locale
    }

    // MARK: - Initialization

    /// Creates a new localization manager.
    ///
    /// - Parameter defaults: The `UserDefaults` suite used for persistence.
    ///   Defaults to `.standard`.
    public init(defaults: UserDefaults = .standard) {
        let localeBundle = LocaleBundle.shared
        self.defaults = defaults
        self.localeBundle = localeBundle
        self.currentLanguage = Self.restoredLanguage(from: defaults)
        localeBundle.preload(currentLanguage)
        logger.info("Initialized with language \(self.currentLanguage.rawValue)")
    }

    // MARK: - Public API

    /// Changes the active language. The new choice is persisted and a
    /// `languageDidChangeNotification` is posted.
    public func setLanguage(_ language: Language) {
        currentLanguage = language
    }

    /// Returns the localized string for the given dot-separated key path.
    ///
    /// Example: `t("account.title")` returns `"My Account"` for English.
    public func t(_ key: String) -> String {
        localeBundle.string(for: key, language: currentLanguage)
    }

    /// Returns the localized string with `{{placeholder}}` interpolation.
    ///
    /// Example: `t("admin.plans.trialDays", ["days": "14"])` produces
    /// `"14 day trial"` when the template is `"{{days}} day trial"`.
    public func t(_ key: String, _ args: [String: String]) -> String {
        var result = localeBundle.string(for: key, language: currentLanguage)
        for (placeholder, value) in args {
            result = result.replacingOccurrences(
                of: "{{\(placeholder)}}",
                with: value
            )
        }
        return result
    }

    // MARK: - Persistence

    private func persist(_ language: Language) {
        defaults.set(language.rawValue, forKey: Keys.persistedLanguage)
    }

    private static func restoredLanguage(from defaults: UserDefaults) -> Language {
        guard let raw = defaults.string(forKey: Keys.persistedLanguage),
              let language = Language(rawValue: raw) else {
            return .english
        }
        return language
    }
}
