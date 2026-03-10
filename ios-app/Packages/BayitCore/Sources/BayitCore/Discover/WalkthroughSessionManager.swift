import Foundation
import Observation

@Observable
@MainActor
public final class WalkthroughSessionManager {
    public static let shared = WalkthroughSessionManager()

    public private(set) var activeSession: WalkthroughSession?

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

    private init() {}

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
            context: ["featureId": session.featureId, "token": session.sessionToken]
        )
    }

    public func end() {
        guard let session = activeSession else { return }
        if session.stateMachine.isActive {
            session.stateMachine.skip()
        }
        logger.info(
            "Walkthrough session ended",
            context: ["featureId": session.featureId]
        )
        activeSession = nil
    }
}
