import Foundation

public struct WalkthroughStep: Sendable, Identifiable {
    public let id: String
    public let instructionKey: String
    public let targetAccessibilityId: String
    public let expectedAction: WalkthroughAction
    public let order: Int
    public let prerequisiteType: String?

    public init(
        id: String,
        instructionKey: String,
        targetAccessibilityId: String,
        expectedAction: WalkthroughAction,
        order: Int,
        prerequisiteType: String? = nil
    ) {
        self.id = id
        self.instructionKey = instructionKey
        self.targetAccessibilityId = targetAccessibilityId
        self.expectedAction = expectedAction
        self.order = order
        self.prerequisiteType = prerequisiteType
    }
}
