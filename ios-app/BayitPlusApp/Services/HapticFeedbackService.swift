#if os(iOS)
import UIKit

/// Centralized haptic feedback service providing impact, notification,
/// and selection haptics throughout the app.
enum HapticFeedbackService {

    /// Trigger an impact haptic with the given style.
    static func impact(style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }

    /// Trigger a notification haptic (success, warning, error).
    static func notification(type: UINotificationFeedbackGenerator.FeedbackType) {
        UINotificationFeedbackGenerator().notificationOccurred(type)
    }

    /// Trigger a selection-changed haptic (light tap for toggles and pickers).
    static func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }
}
#endif
