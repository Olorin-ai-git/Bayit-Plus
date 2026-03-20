import Foundation
import Observation

/// Reactive store for user-controlled UI element visibility.
/// Injected as an environment object so MainTabView and SettingsViewModel
/// share the same source of truth without tight coupling.
@MainActor
@Observable
final class UserUIPreferencesStore {
    var showWidgetsDock: Bool = false
    var showVoiceControlFAB: Bool = false

    private static let homepageStyleKey = "bayit.plus.homepageStyle"

    var homepageStyle: String {
        didSet { UserDefaults.standard.set(homepageStyle, forKey: Self.homepageStyleKey) }
    }

    var isCinematicHome: Bool {
        homepageStyle == "cinematic"
    }

    init() {
        homepageStyle = UserDefaults.standard.string(forKey: Self.homepageStyleKey) ?? "cinematic"
    }

    /// Sync state from a backend preferences response.
    func apply(_ prefs: UserPreferencesDetail?) {
        showWidgetsDock = prefs?.showWidgetsDock ?? false
        showVoiceControlFAB = prefs?.showVoiceControlFAB ?? false
    }
}
