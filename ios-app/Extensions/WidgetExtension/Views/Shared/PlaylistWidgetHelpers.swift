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

    /// Format duration in seconds as human-readable string.
    /// Returns "Xh Ym" for longer content or "Xm" for shorter.
    static func formattedDuration(_ seconds: Int) -> String {
        let minutes = seconds / 60
        if minutes >= 60 {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            if remainingMinutes > 0 {
                return "\(hours)h \(remainingMinutes)m"
            }
            return "\(hours)h"
        }
        return "\(max(minutes, 1))m"
    }
}
