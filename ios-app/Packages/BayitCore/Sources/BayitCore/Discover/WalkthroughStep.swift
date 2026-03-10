import Foundation

public struct WalkthroughStep: Sendable, Identifiable {
    public let id: String
    public let instructionKey: String
    public let targetAccessibilityId: String
    public let expectedAction: WalkthroughAction
    public let order: Int

    public init(
        id: String,
        instructionKey: String,
        targetAccessibilityId: String,
        expectedAction: WalkthroughAction,
        order: Int
    ) {
        self.id = id
        self.instructionKey = instructionKey
        self.targetAccessibilityId = targetAccessibilityId
        self.expectedAction = expectedAction
        self.order = order
    }
}
