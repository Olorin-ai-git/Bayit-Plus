import BayitCore
import Foundation
import Observation

/// Central voice interaction state machine.
///
/// Ported from shared/services/olorinVoiceOrchestrator.ts.
/// Manages the full voice pipeline lifecycle:
/// idle -> listening -> processing -> speaking -> idle
///
/// Coordinates STT, TTS, WebSocket streaming, and intent routing.
@Observable
@MainActor
public final class VoiceOrchestrator {

    // MARK: - Observable State

    public private(set) var state: VoiceState = .idle
    public private(set) var currentTranscript = ""
    public private(set) var responseText = ""
    public private(set) var lastIntent: VoiceIntentType?
    public private(set) var lastAction: VoiceAction?
    public private(set) var lastGesture: GestureState?
    public private(set) var conversationId: String?
    public private(set) var error: String?

    // MARK: - Dependencies

    private let speechService: SpeechRecognitionService
    private let ttsService: TTSService
    private let webSocketClient: VoiceWebSocketClient
    private let voiceRepository: any VoiceRepository
    private let logger = BayitLogger(category: "VoiceOrchestrator")

    /// Current language for STT/TTS
    public var language: String = "en"

    /// Callback when an intent action should be executed (navigation, playback, etc.)
    public var onIntentAction: ((VoiceIntentType, VoiceAction) -> Void)?

    // MARK: - Private State

    private var recognitionStop: (@Sendable () -> Void)?
    private var recognitionTask: Task<Void, Never>?
    private var safetyTimeoutTask: Task<Void, Never>?

    /// Safety timeout for speaking state (matches TS: 10 seconds)
    private let speakingTimeout: TimeInterval = 10

    public init(
        speechService: SpeechRecognitionService,
        ttsService: TTSService,
        webSocketClient: VoiceWebSocketClient,
        voiceRepository: any VoiceRepository
    ) {
        self.speechService = speechService
        self.ttsService = ttsService
        self.webSocketClient = webSocketClient
        self.voiceRepository = voiceRepository
    }

    // MARK: - Public API

    /// Start a voice interaction session.
    public func startInteraction(trigger: VoiceTrigger = .manual) {
        guard state == .idle || state == .error else {
            logger.warning("Cannot start interaction in state: \(state.rawValue)")
            return
        }

        error = nil
        currentTranscript = ""
        responseText = ""

        transition(to: .listening)
        startListening()

        logger.info(
            "Voice interaction started",
            context: ["trigger": trigger.rawValue, "language": language]
        )
    }

    /// Stop listening and commit the current transcript for processing.
    public func commitTranscript() {
        guard state == .listening else { return }
        recognitionStop?()
        recognitionStop = nil

        guard !currentTranscript.isEmpty else {
            transition(to: .idle)
            return
        }

        transition(to: .processing)
        processTranscript(currentTranscript)
    }

    /// Interrupt and cancel the current interaction.
    public func interrupt() {
        logger.info("Voice interaction interrupted")
        cancelAll()
        transition(to: .idle)
    }

    /// End the entire session and clean up.
    public func endSession() {
        cancelAll()
        conversationId = nil
        transition(to: .idle)
        logger.info("Voice session ended")
    }

    // MARK: - Listening

    private func startListening() {
        recognitionTask = Task {
            do {
                let (stream, stop) = try speechService.startRecognition(language: language)
                self.recognitionStop = stop

                for await result in stream {
                    await MainActor.run {
                        self.currentTranscript = result.transcription
                    }
                    if result.isFinal {
                        await MainActor.run {
                            self.commitTranscript()
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    self.handleError(error.localizedDescription)
                }
            }
        }
    }

    // MARK: - Processing

    private func processTranscript(_ transcript: String) {
        Task {
            do {
                let request = VoiceRequest(
                    transcript: transcript,
                    language: language,
                    conversationId: conversationId
                )
                let response = try await voiceRepository.processVoice(request: request)

                await MainActor.run {
                    self.conversationId = response.conversationId
                    self.lastIntent = response.intent
                    self.lastAction = response.action
                    self.lastGesture = response.gesture

                    if let spoken = response.spokenResponse, !spoken.isEmpty {
                        self.responseText = spoken
                        self.speakResponse(spoken)
                    } else {
                        self.transition(to: .idle)
                    }

                    // Execute intent action
                    if let intent = self.lastIntent, let action = response.action {
                        self.onIntentAction?(intent, action)
                    }
                }
            } catch {
                await MainActor.run {
                    self.handleError(error.localizedDescription)
                }
            }
        }
    }

    // MARK: - Speaking

    private func speakResponse(_ text: String) {
        transition(to: .speaking)
        ttsService.speak(text, language: language)

        // Safety timeout to prevent stuck speaking state
        safetyTimeoutTask?.cancel()
        safetyTimeoutTask = Task {
            try? await Task.sleep(for: .seconds(speakingTimeout))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                if self.state == .speaking {
                    self.logger.warning("Speaking safety timeout reached")
                    self.ttsService.stop()
                    self.transition(to: .idle)
                }
            }
        }
    }

    // MARK: - State Machine

    private func transition(to newState: VoiceState) {
        let oldState = state
        guard Self.isValidTransition(from: oldState, to: newState) else {
            logger.warning(
                "Invalid transition",
                context: ["from": oldState.rawValue, "to": newState.rawValue]
            )
            return
        }
        state = newState
        logger.debug(
            "State transition",
            context: ["from": oldState.rawValue, "to": newState.rawValue]
        )
    }

    /// Validate state transitions matching olorinVoiceOrchestrator.ts
    private static func isValidTransition(from: VoiceState, to: VoiceState) -> Bool {
        switch (from, to) {
        case (.idle, .listening),
             (.listening, .processing),
             (.listening, .idle),
             (.processing, .speaking),
             (.processing, .idle),
             (.speaking, .idle),
             (.speaking, .listening),
             (.error, .idle),
             (.error, .listening),
             (_, .error),
             (_, .idle):
            return true
        default:
            return false
        }
    }

    // MARK: - Error Handling

    private func handleError(_ message: String) {
        error = message
        transition(to: .error)
        logger.error("Voice error: \(message)")

        // Auto-recover to idle after 3 seconds (matches TS behavior)
        Task {
            try? await Task.sleep(for: .seconds(3))
            await MainActor.run {
                if self.state == .error {
                    self.transition(to: .idle)
                }
            }
        }
    }

    // MARK: - Cleanup

    private func cancelAll() {
        recognitionStop?()
        recognitionStop = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        safetyTimeoutTask?.cancel()
        safetyTimeoutTask = nil
        ttsService.stop()
    }
}

// MARK: - Voice Repository Protocol

/// Protocol for voice API interactions.
public protocol VoiceRepository: Sendable {
    func processVoice(request: VoiceRequest) async throws -> VoiceResponse
}
