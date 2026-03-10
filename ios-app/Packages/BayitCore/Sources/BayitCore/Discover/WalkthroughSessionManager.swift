import Foundation
import Observation
#if canImport(UIKit)
    import UIKit
#endif

@Observable
@MainActor
public final class WalkthroughSessionManager {
    public static let shared = WalkthroughSessionManager()

    public private(set) var activeSession: WalkthroughSession?
    public var onSessionEnd: ((String, Int, Bool) async -> Void)?

    public var isActive: Bool {
        activeSession != nil
    }

    public var sessionToken: String? {
        activeSession?.sessionToken
    }

    public var currentFeatureId: String? {
        activeSession?.featureId
    }

    public var stateMachine: WalkthroughStateMachine? {
        activeSession?.stateMachine
    }

    private let logger = BayitLogger(category: "WalkthroughSession")

    private init() {
        #if canImport(UIKit) && !os(watchOS)
            observeBackgroundTransition()
        #endif
    }

    public func start(session: WalkthroughSession) {
        if let existing = activeSession {
            logger.warning(
                "Ending existing walkthrough before starting new one",
                context: ["previousFeature": existing.featureId, "newFeature": session.featureId]
            )
            end()
        }
        activeSession = session
        logger.info(
            "Walkthrough session started",
            context: ["featureId": session.featureId]
        )
    }

    public func end() {
        guard let session = activeSession else { return }
        let featureId = session.featureId
        let steps = session.stateMachine.totalSteps
        let skipped = !session.stateMachine.isComplete
        if session.stateMachine.isActive {
            session.stateMachine.skip()
        }
        logger.info(
            "Walkthrough session ended",
            context: ["featureId": featureId]
        )
        activeSession = nil
        if let callback = onSessionEnd {
            Task { await callback(featureId, steps, skipped) }
        }
    }

    #if canImport(UIKit) && !os(watchOS)
        private func observeBackgroundTransition() {
            NotificationCenter.default.addObserver(
                forName: UIApplication.didEnterBackgroundNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor in
                    self?.end()
                }
            }
        }
    #endif
}
