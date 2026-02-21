#if os(iOS)
    import AVFoundation
    import BayitCore
    import Foundation

    // MARK: - Input Processing & TTS

    extension AvatarViewModel {
        @MainActor
        func processInput(_ text: String) async {
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
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
                stateMachine.reset()
                logger.error("Avatar chat processing failed", error: error)
            }

            isProcessing = false
        }

        func speakResponse(_ text: String) {
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
    }
#endif
