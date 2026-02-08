import AVFoundation
import BayitCore
import Foundation
import Observation
import Speech
import UIKit

/// ViewModel managing the AI avatar experience including state, dialogue,
/// voice recognition, TTS output, and user preferences.
@Observable
final class AvatarViewModel {

    // MARK: - Public State

    var state: AvatarState { stateMachine.currentState }
    private(set) var dialogues: [AvatarDialogue] = []
    private(set) var preferences: AvatarPreference?
    private(set) var isProcessing = false
    private(set) var error: String?
    private(set) var currentTranscript = ""

    // MARK: - Private

    private let stateMachine: AvatarStateMachine
    private let repository: any ChatRepository
    private let synthesizer = AVSpeechSynthesizer()
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private let logger = BayitLogger(category: "AvatarViewModel")
    private var conversationId: String?

    // MARK: - Avatar Styles

    static let availableStyles = ["orb", "wave", "geometric", "crystal"]
    static let availableVoices = ["natural", "warm", "energetic", "calm"]
    static let availablePersonalities = ["friendly", "professional", "playful", "wise"]

    // MARK: - Init

    init(stateMachine: AvatarStateMachine, repository: any ChatRepository) {
        self.stateMachine = stateMachine
        self.repository = repository
        self.speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    }

    // MARK: - Voice Interaction

    @MainActor
    func startVoiceInput() async {
        guard stateMachine.currentState == .idle else { return }
        stateMachine.startListening()
        currentTranscript = ""

        do {
            try configureAudioSession()
            try startSpeechRecognition()
            logger.info("Avatar voice input started")
        } catch {
            self.error = error.localizedDescription
            stateMachine.reset()
            logger.error("Failed to start voice input", error: error)
        }
    }

    @MainActor
    func stopVoiceInput() async {
        stopRecognition()
        stateMachine.onSpeechEnd()

        guard !currentTranscript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            stateMachine.reset()
            return
        }

        await processInput(currentTranscript)
    }

    @MainActor
    func sendTextInput(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        stateMachine.transition(to: .thinking)
        await processInput(trimmed)
    }

    // MARK: - Preferences

    @MainActor
    func updatePreferences(style: String?, voice: String?, personality: String?, animationLevel: String?) {
        preferences = AvatarPreference(
            avatarStyle: style ?? preferences?.avatarStyle,
            voiceId: voice ?? preferences?.voiceId,
            personality: personality ?? preferences?.personality,
            animationLevel: animationLevel ?? preferences?.animationLevel
        )
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        logger.info("Avatar preferences updated", context: [
            "style": style ?? "unchanged",
            "voice": voice ?? "unchanged"
        ])
    }

    // MARK: - State Access

    var currentState: AvatarState {
        stateMachine.currentState
    }

    var transitionDuration: TimeInterval {
        stateMachine.transitionDuration
    }

    var springResponse: Double {
        stateMachine.springResponse
    }

    var springBounce: Double {
        stateMachine.springBounce
    }

    // MARK: - Private

    @MainActor
    private func processInput(_ text: String) async {
        isProcessing = true

        let userDialogue = AvatarDialogue(
            id: UUID().uuidString,
            text: text,
            emotion: nil,
            action: "user_input"
        )
        dialogues.append(userDialogue)

        do {
            let request = ChatRequest(
                message: text,
                conversationId: conversationId,
                context: "avatar_mode",
                language: nil
            )
            let response = try await repository.sendMessage(request)
            conversationId = response.conversationId

            let aiDialogue = AvatarDialogue(
                id: UUID().uuidString,
                text: response.response,
                emotion: "neutral",
                action: "response"
            )
            dialogues.append(aiDialogue)

            stateMachine.onResponseReady()
            speakResponse(response.response ?? "")

        } catch {
            self.error = error.localizedDescription
            stateMachine.reset()
            logger.error("Avatar chat processing failed", error: error)
        }

        isProcessing = false
    }

    private func speakResponse(_ text: String) {
        guard !text.isEmpty else {
            Task { @MainActor in stateMachine.onSpeechComplete() }
            return
        }

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        synthesizer.speak(utterance)

        Task {
            let estimatedDuration = max(2.0, Double(text.count) * 0.05)
            try? await Task.sleep(nanoseconds: UInt64(estimatedDuration * 1_000_000_000))
            await MainActor.run {
                stateMachine.onSpeechComplete()
            }
        }
    }

    private func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }

    private func startSpeechRecognition() throws {
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            throw SpeechError.recognizerUnavailable
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = speechRecognizer.supportsOnDeviceRecognition
        self.recognitionRequest = request

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, _ in
            if let result {
                Task { @MainActor in
                    self?.currentTranscript = result.bestTranscription.formattedString
                }
            }
        }
    }

    private func stopRecognition() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
    }
}

// MARK: - Errors

private enum SpeechError: LocalizedError {
    case recognizerUnavailable

    var errorDescription: String? {
        switch self {
        case .recognizerUnavailable:
            return "Speech recognizer is not available on this device"
        }
    }
}
