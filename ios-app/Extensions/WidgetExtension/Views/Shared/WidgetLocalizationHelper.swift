import SwiftUI
import BayitWidgetShared

/// Provides RTL detection and layout direction for widgets.
///
/// Reads the persisted language preference from the shared UserDefaults
/// App Group and determines whether the layout should be right-to-left.
/// The main app's `LocalizationManager` writes the language code to
/// standard UserDefaults; the widget reads it via `SharedDefaults`.
enum WidgetLocalizationHelper {

    /// The UserDefaults key used by `LocalizationManager` to persist
    /// the selected language code.
    private static let languageKey = "tv.bayit.localization.selectedLanguage"

    /// Returns `true` when the persisted language is Hebrew.
    static func isRTL() -> Bool {
        let defaults = UserDefaults(
            suiteName: WidgetConfigurationKeys.appGroupID
        )
        let languageCode = defaults?.string(forKey: languageKey)
            ?? UserDefaults.standard.string(forKey: languageKey)
        return languageCode == "he"
    }

    /// The layout direction matching the persisted language.
    static var layoutDirection: LayoutDirection {
        isRTL() ? .rightToLeft : .leftToRight
    }
}

// MARK: - View Modifier

/// Applies the correct layout direction based on the user's
/// persisted language preference.
struct WidgetLayoutDirectionModifier: ViewModifier {

    func body(content: Content) -> some View {
        content
            .environment(
                \.layoutDirection,
                WidgetLocalizationHelper.layoutDirection
            )
    }
}

extension View {

    /// Applies RTL layout direction when the user's language is Hebrew.
    func widgetLayoutDirection() -> some View {
        modifier(WidgetLayoutDirectionModifier())
    }
}
