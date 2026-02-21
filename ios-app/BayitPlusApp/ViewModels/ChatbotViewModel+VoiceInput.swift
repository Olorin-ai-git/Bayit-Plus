#if os(iOS)
    import AVFoundation
    import BayitCore
    import Speech
    import UIKit

    /// Extension on ChatbotViewModel providing voice input via Speech framework.
    extension ChatbotViewModel {
        @MainActor
        func toggleVoiceInput() async {
            if isRecording {
                stopVoiceInput()
            } else {
                await startVoiceInput()
            }
        }

        @MainActor
        func startVoiceInput() async {
            guard let speechRecognizer, speechRecognizer.isAvailable else {
                error = "Speech recognition is not available"
                return
            }

            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
                try session.setActive(true, options: .notifyOthersOnDeactivation)

                let request = SFSpeechAudioBufferRecognitionRequest()
                request.shouldReportPartialResults = true
                request.requiresOnDeviceRecognition = speechRecognizer.supportsOnDeviceRecognition
                recognitionRequest = request

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
                            self?.voiceTranscript = result.bestTranscription.formattedString
                            self?.inputText = result.bestTranscription.formattedString
                        }
                    }
                }

                isRecording = true
                voiceTranscript = ""

                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
                logger.info("Voice input started")
            } catch {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
                logger.error("Failed to start voice input", error: error)
            }
        }

        @MainActor
        func stopVoiceInput() {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
            recognitionRequest?.endAudio()
            recognitionTask?.cancel()
            recognitionRequest = nil
            recognitionTask = nil
            isRecording = false

            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            logger.info("Voice input stopped", context: ["transcript": voiceTranscript])
        }
    }
#endif
