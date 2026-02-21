#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitVoice
    import SwiftUI

    // MARK: - TVVoiceAssistantSheet + Actions

    extension TVVoiceAssistantSheet {
        func toggleRecording() async {
            if isRecording {
                await stopRecordingAndTranscribe()
            } else {
                startRecording()
            }
        }

        func startRecording() {
            errorMessage = nil
            aiResponse = ""

            do {
                try audioService.startRecording()
                isRecording = true
                logger.info("Voice assistant recording started")
            } catch {
                errorMessage = "Microphone access unavailable"
                logger.error("Failed to start recording", error: error)
            }
        }

        func stopRecordingAndTranscribe() async {
            let audioData = audioService.stopRecording()
            isRecording = false

            guard !audioData.isEmpty else {
                errorMessage = "No audio captured"
                return
            }

            isTranscribing = true
            do {
                let transcribeResult = try await chatRepository.transcribeAudio(
                    data: audioData, language: nil
                )
                if let transcription = transcribeResult.text, !transcription.isEmpty {
                    inputText = transcription
                    isTranscribing = false
                    processQuery()
                } else {
                    isTranscribing = false
                    errorMessage = "Could not transcribe audio"
                }
            } catch {
                isTranscribing = false
                errorMessage = "Transcription failed"
                logger.error("Transcription failed", error: error)
            }
        }

        func processQuery() {
            let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { return }

            errorMessage = nil
            aiResponse = ""
            isProcessing = true
            let userMessage = text
            inputText = ""

            Task {
                do {
                    let request = ChatRequest(
                        message: userMessage,
                        conversationId: nil,
                        context: "voice_assistant",
                        language: nil
                    )
                    let response = try await chatRepository.sendMessage(request)
                    aiResponse = response.response ?? ""
                } catch {
                    errorMessage = "Could not get a response"
                }
                isProcessing = false
            }
        }
    }
#endif
