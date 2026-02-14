import Foundation

/// Shared helper functions for playlist widgets.
enum PlaylistWidgetHelpers {

    /// Format item count text with proper pluralization and localization.
    /// Returns localized string for track count.
    static func itemCountText(_ count: Int) -> String {
        WidgetStrings.trackCount(count)
    }
}
