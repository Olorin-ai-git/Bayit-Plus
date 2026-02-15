import Foundation

/// Shared helper functions for playlist widgets.
enum PlaylistWidgetHelpers {

    /// Format item count text with proper pluralization and localization.
    /// Returns localized string for track count.
    static func itemCountText(_ count: Int) -> String {
        let format = NSLocalizedString(
            "widget.playlist.trackCount",
            value: "%d track(s)",
            comment: "Number of tracks in playlist"
        )
        return String(format: format, count)
    }
}
