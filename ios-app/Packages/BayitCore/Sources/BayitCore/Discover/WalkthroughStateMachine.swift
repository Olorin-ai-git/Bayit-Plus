import Foundation
import Observation

@MainActor
@Observable
public final class WalkthroughStateMachine {
    public let feature: DiscoverFeature
    public let firstVisibleIndex: Int
    public private(set) var currentStepIndex: Int
    public private(set) var isActive: Bool
    public private(set) var isComplete: Bool
    public private(set) var isAwaitingPrerequisite: Bool = false
    public private(set) var awaitingPrerequisiteType: String?

    private let defaults: UserDefaults

    public var currentStep: WalkthroughStep? {
        guard currentStepIndex < feature.walkthroughSteps.count else { return nil }
        return feature.walkthroughSteps[currentStepIndex]
    }

    public var progress: Double {
        let visible = totalSteps
        guard visible > 0 else { return 1.0 }
        return Double(currentStepIndex - firstVisibleIndex) / Double(visible)
    }

    public var totalSteps: Int {
        feature.walkthroughSteps.count - firstVisibleIndex
    }

    public var displayStepIndex: Int {
        currentStepIndex - firstVisibleIndex
    }

    public var isLastStep: Bool {
        currentStepIndex >= feature.walkthroughSteps.count - 1
    }

    public init(feature: DiscoverFeature, defaults: UserDefaults = .standard) {
        self.feature = feature
        self.defaults = defaults
        var start = 0
        while start < feature.walkthroughSteps.count,
              feature.walkthroughSteps[start].expectedAction == .navigate
        {
            start += 1
        }
        firstVisibleIndex = start
        currentStepIndex = start
        isActive = start < feature.walkthroughSteps.count
        isComplete = start >= feature.walkthroughSteps.count
    }

    public func advance() {
        guard isActive, !isComplete else { return }
        if let step = currentStep, let prereqType = step.prerequisiteType, !isAwaitingPrerequisite {
            pauseForPrerequisite(prereqType)
            return
        }
        if currentStepIndex < feature.walkthroughSteps.count - 1 {
            currentStepIndex += 1
        } else {
            complete()
        }
    }

    public func pauseForPrerequisite(_ type: String) {
        isAwaitingPrerequisite = true
        awaitingPrerequisiteType = type
    }

    public func resumeFromPrerequisite() {
        isAwaitingPrerequisite = false
        awaitingPrerequisiteType = nil
        if currentStepIndex < feature.walkthroughSteps.count - 1 {
            currentStepIndex += 1
        } else {
            complete()
        }
    }

    public func skip() {
        isActive = false
        persistCompletion()
    }

    public func complete() {
        isComplete = true
        isActive = false
        persistCompletion()
    }

    private func persistCompletion() {
        let key = Self.completionKey(for: feature.id)
        defaults.set(true, forKey: key)
    }

    public static func hasCompleted(
        featureId: String,
        defaults: UserDefaults = .standard
    ) -> Bool {
        defaults.bool(forKey: completionKey(for: featureId))
    }

    public static func resetCompletion(
        featureId: String,
        defaults: UserDefaults = .standard
    ) {
        defaults.removeObject(forKey: completionKey(for: featureId))
    }

    private static func completionKey(for featureId: String) -> String {
        "discover.walkthrough.completed.\(featureId)"
    }
}
