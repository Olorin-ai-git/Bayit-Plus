import BayitCore
import Foundation
import Observation

/// State machine managing the AI avatar's visual and behavioral transitions.
///
/// Enforces valid state transitions:
/// - idle -> listening (on voice activation)
/// - listening -> thinking (on speech end)
/// - thinking -> speaking (on response received)
/// - speaking -> idle (on speech complete)
/// - speaking -> celebrating (on special event)
/// - celebrating -> idle (on animation complete)
/// - Any state -> idle (on reset/cancel)
@Observable
final class AvatarStateMachine {

    // MARK: - Public State

    private(set) var currentState: AvatarState = .idle
    private(set) var previousState: AvatarState?
    private(set) var transitionCount = 0

    // MARK: - Private

    private let logger = BayitLogger(category: "AvatarStateMachine")

    // MARK: - Transitions

    /// Attempt a state transition. Returns true if the transition was valid.
    @MainActor
    @discardableResult
    func transition(to newState: AvatarState) -> Bool {
        guard isValidTransition(from: currentState, to: newState) else {
            logger.warning("Invalid avatar transition attempted", context: [
                "from": currentState.rawValue,
                "to": newState.rawValue
            ])
            return false
        }

        previousState = currentState
        currentState = newState
        transitionCount += 1

        logger.info("Avatar state transitioned", context: [
            "from": previousState?.rawValue ?? "none",
            "to": currentState.rawValue,
            "count": "\(transitionCount)"
        ])

        return true
    }

    /// Reset the state machine to idle regardless of current state.
    @MainActor
    func reset() {
        previousState = currentState
        currentState = .idle
        logger.info("Avatar state machine reset")
    }

    /// Start listening when the user activates voice input.
    @MainActor
    func startListening() {
        transition(to: .listening)
    }

    /// Move to thinking when speech input ends.
    @MainActor
    func onSpeechEnd() {
        transition(to: .thinking)
    }

    /// Move to speaking when the AI response is ready.
    @MainActor
    func onResponseReady() {
        transition(to: .speaking)
    }

    /// Move to idle when speech output completes.
    @MainActor
    func onSpeechComplete() {
        transition(to: .idle)
    }

    /// Trigger celebration state for special events.
    @MainActor
    func celebrate() {
        transition(to: .celebrating)
    }

    // MARK: - Validation

    private func isValidTransition(from: AvatarState, to: AvatarState) -> Bool {
        if to == .idle { return true }

        switch (from, to) {
        case (.idle, .listening):
            return true
        case (.listening, .thinking):
            return true
        case (.thinking, .speaking):
            return true
        case (.speaking, .celebrating):
            return true
        case (.celebrating, .idle):
            return true
        case (.speaking, .idle):
            return true
        default:
            return false
        }
    }

    // MARK: - Animation Configuration

    /// Duration for the transition animation between states.
    var transitionDuration: TimeInterval {
        switch currentState {
        case .idle:
            return 0.4
        case .listening:
            return 0.3
        case .thinking:
            return 0.5
        case .speaking:
            return 0.3
        case .celebrating:
            return 0.6
        }
    }

    /// Spring response for the current state's animation.
    var springResponse: Double {
        switch currentState {
        case .idle:
            return 0.6
        case .listening:
            return 0.4
        case .thinking:
            return 0.8
        case .speaking:
            return 0.5
        case .celebrating:
            return 0.3
        }
    }

    /// Spring bounce for the current state's animation.
    var springBounce: Double {
        switch currentState {
        case .idle:
            return 0.1
        case .listening:
            return 0.2
        case .thinking:
            return 0.0
        case .speaking:
            return 0.15
        case .celebrating:
            return 0.4
        }
    }
}
