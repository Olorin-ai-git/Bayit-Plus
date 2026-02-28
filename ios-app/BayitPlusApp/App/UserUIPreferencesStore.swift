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

    /// Sync state from a backend preferences response.
    func apply(_ prefs: UserPreferencesDetail?) {
        showWidgetsDock = prefs?.showWidgetsDock ?? false
        showVoiceControlFAB = prefs?.showVoiceControlFAB ?? false
    }
}
