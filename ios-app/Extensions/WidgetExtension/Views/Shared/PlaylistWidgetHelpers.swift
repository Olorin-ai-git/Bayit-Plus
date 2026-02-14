import Foundation

/// Shared helper functions for playlist widgets.
enum PlaylistWidgetHelpers {

    /// Format item count text with proper pluralization.
    /// Returns localized string for track count.
    static func itemCountText(_ count: Int) -> String {
        count == 1 ? "1 track" : "\(count) tracks"
    }
}
