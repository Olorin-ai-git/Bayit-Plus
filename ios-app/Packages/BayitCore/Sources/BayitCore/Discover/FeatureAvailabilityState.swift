import Foundation

public enum FeatureAvailabilityState: Sendable {
    case ready
    case setupNeeded([FeaturePrerequisite])
    case premiumRequired
    case notAvailable(reasonKey: String)
    case platformOnly(Platform)

    public var badgeColorName: String {
        switch self {
        case .ready: return "green"
        case .setupNeeded: return "orange"
        case .premiumRequired: return "purple"
        case .notAvailable: return "gray"
        case .platformOnly: return "blue"
        }
    }

    public var badgeLabelKey: String {
        switch self {
        case .ready: return "discover.badge.ready"
        case .setupNeeded: return "discover.badge.setupNeeded"
        case .premiumRequired: return "discover.badge.premium"
        case .notAvailable: return "discover.badge.notAvailable"
        case .platformOnly: return "discover.badge.platformOnly"
        }
    }
}
