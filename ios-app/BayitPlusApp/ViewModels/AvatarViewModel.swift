#if os(iOS)
    import AVFoundation
    import BayitCore
    import Foundation
    import Observation
    import Speech
    import UIKit

    /// ViewModel managing the AI avatar experience including state, dialogue,
    /// voice recognition, TTS output, and user preferences.
    /// Available on iOS only. Depends on Speech.framework for voice input.
    @MainActor
    @Observable
    final class AvatarViewModel {
        // MARK: - Public State

        var state: AvatarState {
            stateMachine.currentState
        }

        var dialogues: [AvatarDialogue] = []
        var preferences: AvatarPreference?
        var isProcessing = false
        var error: String?
        var currentTranscript = ""

        // MARK: - Internal (for extensions)

        let stateMachine: AvatarStateMachine
        let repository: any ChatRepository
        let synthesizer = AVSpeechSynthesizer()
        var speechRecognizer: SFSpeechRecognizer?
        var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
        var recognitionTask: SFSpeechRecognitionTask?
        let audioEngine = AVAudioEngine()
        let logger = BayitLogger(category: "AvatarViewModel")
        var conversationId: String?

        // MARK: - Avatar Styles

        static let availableStyles = ["orb", "wave", "geometric", "crystal"]
        static let availableVoices = ["natural", "warm", "energetic", "calm"]
        static let availablePersonalities = ["friendly", "professional", "playful", "wise"]

        // MARK: - Init

        init(stateMachine: AvatarStateMachine, repository: any ChatRepository) {
            self.stateMachine = stateMachine
            self.repository = repository
            speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
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
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
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
                "voice": voice ?? "unchanged",
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
    }
#endif
