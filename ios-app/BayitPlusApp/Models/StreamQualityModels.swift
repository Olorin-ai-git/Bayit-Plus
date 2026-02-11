import Foundation

/// HLS quality tiers for stream selection.
enum StreamQuality: String, CaseIterable, Identifiable, Sendable {
    case auto
    case high
    case medium
    case low

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .auto: return "Auto"
        case .high: return "High"
        case .medium: return "Medium"
        case .low: return "Low"
        }
    }

    var displayDescription: String {
        switch self {
        case .auto: return "Adapts to your connection"
        case .high: return "1080p / Best quality"
        case .medium: return "720p / Balanced"
        case .low: return "480p / Data saver"
        }
    }

    /// The quality parameter value sent to the API.
    var apiValue: String? {
        switch self {
        case .auto: return nil
        case .high: return "high"
        case .medium: return "medium"
        case .low: return "low"
        }
    }
}
