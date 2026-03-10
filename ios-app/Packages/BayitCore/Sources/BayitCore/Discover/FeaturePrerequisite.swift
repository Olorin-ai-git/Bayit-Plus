import Foundation

public struct FeaturePrerequisite: Sendable, Identifiable {
    public let id: String
    public let type: PrerequisiteType
    public let labelKey: String
    public let fixRoute: String?

    public init(
        id: String,
        type: PrerequisiteType,
        labelKey: String,
        fixRoute: String? = nil
    ) {
        self.id = id
        self.type = type
        self.labelKey = labelKey
        self.fixRoute = fixRoute
    }

    public enum PrerequisiteType: String, Sendable {
        case avatar
        case subscription
        case microphone
        case contentType
        case preference
        case voiceClone
    }
}
