import Foundation

@MainActor
public struct WalkthroughSession {
    public let featureId: String
    public let sessionToken: String
    public let stateMachine: WalkthroughStateMachine

    public init(feature: DiscoverFeature) {
        featureId = feature.id
        sessionToken = UUID().uuidString
        stateMachine = WalkthroughStateMachine(feature: feature)
    }
}
