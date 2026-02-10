import BayitCore
import Foundation
import Observation

/// tvOS avatar ViewModel. Text-input only — no speech/TTS/mic APIs on Apple TV.
@Observable
final class TVAvatarViewModel {

    // MARK: - Public State

    var state: AvatarState { stateMachine.currentState }
    private(set) var dialogues: [AvatarDialogue] = []
    private(set) var preferences: AvatarPreference?
    private(set) var isProcessing = false
    private(set) var error: String?

    var inputText = ""

    // MARK: - Static Options

    static let availableStyles = ["orb", "wave", "geometric", "crystal"]
    static let availableVoices = ["natural", "warm", "energetic", "calm"]
    static let availablePersonalities = ["friendly", "professional", "playful", "wise"]

    // MARK: - Private

    private let stateMachine: AvatarStateMachine
    private let repository: any ChatRepository
    private let logger = BayitLogger(category: "TVAvatarViewModel")
    private var conversationId: String?

    // MARK: - Init

    init(stateMachine: AvatarStateMachine, repository: any ChatRepository) {
        self.stateMachine = stateMachine
        self.repository = repository
    }

    // MARK: - Text Input

    @MainActor
    func sendTextInput() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        inputText = ""
        stateMachine.transition(to: .thinking)
        await processInput(text)
    }

    // MARK: - Preferences

    @MainActor
    func updatePreferences(
        style: String?,
        voice: String?,
        personality: String?,
        animationLevel: String?
    ) {
        preferences = AvatarPreference(
            avatarStyle: style ?? preferences?.avatarStyle,
            voiceId: voice ?? preferences?.voiceId,
            personality: personality ?? preferences?.personality,
            animationLevel: animationLevel ?? preferences?.animationLevel
        )
        logger.info("Avatar preferences updated", context: [
            "style": style ?? "unchanged",
            "voice": voice ?? "unchanged"
        ])
    }

    // MARK: - State Access

    var currentState: AvatarState { stateMachine.currentState }
    var transitionDuration: TimeInterval { stateMachine.transitionDuration }
    var springResponse: Double { stateMachine.springResponse }
    var springBounce: Double { stateMachine.springBounce }

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

            // Simulate speaking duration then return to idle
            let responseLength = response.response?.count ?? 0
            let speakDuration = max(1.5, Double(responseLength) * 0.04)
            Task {
                try? await Task.sleep(nanoseconds: UInt64(speakDuration * 1_000_000_000))
                await MainActor.run { stateMachine.onSpeechComplete() }
            }
        } catch {
            self.error = error.localizedDescription
            stateMachine.reset()
            logger.error("Avatar chat processing failed", error: error)
        }

        isProcessing = false
    }
}
