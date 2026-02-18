import Foundation

/// Shared helper functions for Continue Watching widgets.
enum ContinueWatchingWidgetHelpers {

    /// Formats remaining time as "Xh Ym left" or "Xm left".
    static func remainingText(progress: Double, durationSeconds: Int) -> String {
        let remaining = Int(Double(durationSeconds) * (1.0 - progress))
        let minutes = remaining / 60
        if minutes >= 60 {
            return "\(minutes / 60)h \(minutes % 60)m left"
        }
        return "\(max(minutes, 1))m left"
    }
}
