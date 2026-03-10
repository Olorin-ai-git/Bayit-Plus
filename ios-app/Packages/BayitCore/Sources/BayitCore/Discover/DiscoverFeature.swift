import Foundation

public enum Platform: String, Sendable {
    case iOS
    case tvOS
}

public struct DiscoverFeature: Identifiable, Sendable {
    public let id: String
    public let category: DiscoverCategory
    public let nameKey: String
    public let taglineKey: String
    public let descriptionKey: String
    public let iconName: String
    public let platforms: Set<Platform>
    public let prerequisites: [FeaturePrerequisite]
    public let walkthroughSteps: [WalkthroughStep]
    public let deepLinkRoute: String?

    public init(
        id: String,
        category: DiscoverCategory,
        nameKey: String,
        taglineKey: String,
        descriptionKey: String,
        iconName: String,
        platforms: Set<Platform>,
        prerequisites: [FeaturePrerequisite],
        walkthroughSteps: [WalkthroughStep],
        deepLinkRoute: String? = nil
    ) {
        self.id = id
        self.category = category
        self.nameKey = nameKey
        self.taglineKey = taglineKey
        self.descriptionKey = descriptionKey
        self.iconName = iconName
        self.platforms = platforms
        self.prerequisites = prerequisites
        self.walkthroughSteps = walkthroughSteps
        self.deepLinkRoute = deepLinkRoute
    }
}
