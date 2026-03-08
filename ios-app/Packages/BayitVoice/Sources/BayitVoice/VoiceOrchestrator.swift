#if os(iOS)
    import BayitCore
    import Foundation
    import Observation

    /// Central voice interaction state machine.
    ///
    /// Manages the full voice pipeline lifecycle:
    /// idle -> listening -> processing -> speaking -> idle
    ///
    /// Coordinates STT, TTS, WebSocket streaming, and intent routing.
    /// Pipeline implementation in VoiceOrchestrator+Pipeline.swift.
    @Observable
    @MainActor
    public final class VoiceOrchestrator {
        // MARK: - Observable State

        public internal(set) var state: VoiceState = .idle
        public internal(set) var currentTranscript = ""
        public internal(set) var responseText = ""
        public internal(set) var lastIntent: VoiceIntentType?
        public internal(set) var lastAction: VoiceAction?
        public internal(set) var lastGesture: GestureState?
        public internal(set) var conversationId: String?
        public internal(set) var error: String?

        // MARK: - Dependencies

        let speechService: SpeechRecognitionService
        let ttsService: TTSService
        let webSocketClient: VoiceWebSocketClient
        let voiceRepository: any VoiceRepository
        let onDeviceClassifier: OnDeviceIntentClassifier
        let vadController: AdaptiveVADController
        let bargeInDetector: BargeInDetector
        let logger = BayitLogger(category: "VoiceOrchestrator")

        /// Current language for STT/TTS
        public var language: String = "en"

        /// Callback for intent action execution
        public var onIntentAction: ((VoiceIntentType, VoiceAction) -> Void)?

        // MARK: - Internal State

        var recognitionStop: (@Sendable () -> Void)?
        var recognitionTask: Task<Void, Never>?
        var safetyTimeoutTask: Task<Void, Never>?
        var silenceStart: Date?

        let speakingTimeout: TimeInterval = 10

        public init(
            speechService: SpeechRecognitionService,
            ttsService: TTSService,
            webSocketClient: VoiceWebSocketClient,
            voiceRepository: any VoiceRepository,
            onDeviceClassifier: OnDeviceIntentClassifier = .init(),
            vadController: AdaptiveVADController = .init(),
            bargeInDetector: BargeInDetector = .init()
        ) {
            self.speechService = speechService
            self.ttsService = ttsService
            self.webSocketClient = webSocketClient
            self.voiceRepository = voiceRepository
            self.onDeviceClassifier = onDeviceClassifier
            self.vadController = vadController
            self.bargeInDetector = bargeInDetector
        }

        // MARK: - Public API

        public func startInteraction(trigger: VoiceTrigger = .manual) {
            guard state == .idle || state == .error else {
                logger.warning(
                    "Cannot start interaction in state: \(state.rawValue)"
                )
                return
            }

            error = nil
            currentTranscript = ""
            responseText = ""

            transition(to: .listening)
            startListening()

            logger.info(
                "Voice interaction started",
                context: [
                    "trigger": trigger.rawValue, "language": language,
                ]
            )
        }

        public func commitTranscript() {
            guard state == .listening else { return }
            recognitionStop?()
            recognitionStop = nil
            vadController.reset()

            guard !currentTranscript.isEmpty else {
                transition(to: .idle)
                return
            }

            // On-device fast path: try local classification first
            if let localResult = onDeviceClassifier.classify(
                currentTranscript, language: language
            ) {
                logger.info(
                    "On-device intent matched",
                    context: ["intent": localResult.intent.rawValue]
                )
                lastIntent = localResult.intent
                lastAction = localResult.action

                if let intent = lastIntent, let action = localResult.action {
                    onIntentAction?(intent, action)
                }

                if let spoken = localResult.spokenResponse,
                   !spoken.isEmpty
                {
                    responseText = spoken
                    speakResponse(spoken)
                } else {
                    transition(to: .idle)
                }
                return
            }

            transition(to: .processing)
            processTranscript(currentTranscript)
        }

        public func interrupt() {
            logger.info("Voice interaction interrupted")
            cancelAll()
            transition(to: .idle)
        }

        public func endSession() {
            cancelAll()
            conversationId = nil
            transition(to: .idle)
            logger.info("Voice session ended")
        }
    }
#endif

// MARK: - Voice Repository Protocol

public protocol VoiceRepository: Sendable {
    func processVoice(request: VoiceRequest) async throws -> VoiceResponse
}
