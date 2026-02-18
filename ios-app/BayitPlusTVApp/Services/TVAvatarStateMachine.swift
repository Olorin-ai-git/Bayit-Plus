#if os(tvOS)
import BayitCore
import Combine
import Foundation

/// Visual states for the Olorin wizard avatar on tvOS.
/// Maps from the tvOS voice interaction lifecycle to avatar animations.
enum TVAvatarState: String, Equatable, Sendable {
    case hidden
    case idle
    case listening
    case speaking
    case thinking
    case error
}

/// State machine managing the Olorin wizard avatar lifecycle on tvOS.
///
/// Subscribes to `TVVoiceInteractionService` observable properties
/// and drives avatar state transitions accordingly. Uses Combine to
/// bridge `@Observable` property changes into `@Published` state.
@MainActor
final class TVAvatarStateMachine: ObservableObject {

    // MARK: - Published State

    @Published var currentState: TVAvatarState = .hidden
    @Published var animationPhase: Double = 0

    // MARK: - Private

    private let voiceService: TVVoiceInteractionService
    private let logger = BayitLogger(category: "TVAvatarStateMachine")
    private var cancellables = Set<AnyCancellable>()
    private var phaseTimer: AnyCancellable?

    // MARK: - Init

    init(voiceService: TVVoiceInteractionService) {
        self.voiceService = voiceService
        observeVoiceService()
    }

    deinit {
        cancellables.removeAll()
        phaseTimer?.cancel()
    }

    // MARK: - Public API

    /// Request a transition to a new avatar state.
    /// Guards against invalid transitions and logs warnings.
    func transition(to newState: TVAvatarState) {
        guard isValidTransition(from: currentState, to: newState) else {
            logger.warning("Invalid avatar transition", context: [
                "from": currentState.rawValue,
                "to": newState.rawValue
            ])
            return
        }

        let previous = currentState
        currentState = newState
        logger.debug("Avatar state changed", context: [
            "from": previous.rawValue,
            "to": newState.rawValue
        ])

        updateAnimationPhase(for: newState)
    }

    /// Show the avatar and enter idle state.
    func show() {
        transition(to: .idle)
    }

    /// Hide the avatar completely.
    func hide() {
        currentState = .hidden
        stopPhaseTimer()
    }

    // MARK: - Voice Service Observation

    private func observeVoiceService() {
        // Poll the @Observable service state using a timer publisher.
        // Combine bridging for @Observable properties.
        Timer.publish(every: 0.1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.syncWithVoiceService()
            }
            .store(in: &cancellables)
    }

    private func syncWithVoiceService() {
        let listening = voiceService.isListening
        let processing = voiceService.isProcessing
        let hasError = voiceService.errorMessage != nil

        let targetState: TVAvatarState
        if hasError {
            targetState = .error
        } else if processing {
            targetState = .thinking
        } else if listening {
            targetState = .listening
        } else if currentState == .hidden {
            return
        } else {
            targetState = .idle
        }

        if targetState != currentState && currentState != .hidden {
            transition(to: targetState)
        }
    }

    // MARK: - Validation

    private func isValidTransition(from: TVAvatarState, to: TVAvatarState) -> Bool {
        if to == .idle { return true }
        if to == .error { return true }

        switch (from, to) {
        case (.hidden, .idle):
            return true
        case (.idle, .listening):
            return true
        case (.idle, .thinking):
            return true
        case (.listening, .thinking):
            return true
        case (.listening, .speaking):
            return true
        case (.thinking, .speaking):
            return true
        case (.speaking, .idle):
            return true
        case (.error, .idle):
            return true
        default:
            return false
        }
    }

    // MARK: - Animation Phase

    private func updateAnimationPhase(for state: TVAvatarState) {
        switch state {
        case .listening, .speaking, .thinking:
            startPhaseTimer()
        case .idle, .hidden, .error:
            stopPhaseTimer()
            animationPhase = 0
        }
    }

    private func startPhaseTimer() {
        phaseTimer?.cancel()
        phaseTimer = Timer.publish(every: 0.05, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self else { return }
                self.animationPhase += 0.05
                if self.animationPhase > 1.0 {
                    self.animationPhase = 0
                }
            }
    }

    private func stopPhaseTimer() {
        phaseTimer?.cancel()
        phaseTimer = nil
    }
}
#endif
