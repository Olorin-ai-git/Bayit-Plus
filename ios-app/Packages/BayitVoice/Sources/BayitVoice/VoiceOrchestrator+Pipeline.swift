#if os(iOS)
    import BayitCore
    import Foundation

    extension VoiceOrchestrator {
        func startListening() {
            vadController.reset()
            silenceStart = nil

            recognitionTask = Task {
                do {
                    let (stream, stop) = try speechService.startRecognition(
                        language: language
                    )
                    self.recognitionStop = stop

                    for await result in stream {
                        await MainActor.run {
                            self.currentTranscript = result.transcription
                            self.vadController.updateTranscript(result.transcription)
                            self.silenceStart = nil
                        }
                        if result.isFinal {
                            await MainActor.run { self.commitTranscript() }
                        } else {
                            await MainActor.run {
                                if self.silenceStart == nil {
                                    self.silenceStart = Date()
                                }
                                if let start = self.silenceStart,
                                   self.vadController.shouldCommit(
                                       silenceDuration: Date()
                                           .timeIntervalSince(start)
                                   )
                                {
                                    self.commitTranscript()
                                }
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

        func processTranscript(_ transcript: String) {
            Task {
                do {
                    let request = VoiceRequest(
                        transcript: transcript,
                        language: language,
                        conversationId: conversationId
                    )
                    let response = try await voiceRepository.processVoice(
                        request: request
                    )

                    await MainActor.run {
                        self.conversationId = response.conversationId
                        self.lastIntent = response.intent
                        self.lastAction = response.action
                        self.lastGesture = response.gesture

                        if let spoken = response.spokenResponse,
                           !spoken.isEmpty
                        {
                            self.responseText = spoken
                            self.speakResponse(spoken)
                        } else {
                            self.transition(to: .idle)
                        }

                        if let intent = self.lastIntent,
                           let action = response.action
                        {
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

        func speakResponse(_ text: String) {
            transition(to: .speaking)
            ttsService.speak(text, language: language)

            bargeInDetector.onBargeIn = { [weak self] in
                Task { @MainActor in
                    guard let self, self.state == .speaking else { return }
                    self.logger.info("Barge-in detected, interrupting TTS")
                    self.ttsService.stop()
                    self.bargeInDetector.stopMonitoring()
                    self.transition(to: .listening)
                    self.currentTranscript = ""
                    self.startListening()
                }
            }
            bargeInDetector.startMonitoring()

            safetyTimeoutTask?.cancel()
            safetyTimeoutTask = Task {
                try? await Task.sleep(for: .seconds(speakingTimeout))
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    if self.state == .speaking {
                        self.logger.warning("Speaking safety timeout reached")
                        self.ttsService.stop()
                        self.bargeInDetector.stopMonitoring()
                        self.transition(to: .idle)
                    }
                }
            }
        }

        func transition(to newState: VoiceState) {
            let oldState = state
            guard Self.isValidTransition(from: oldState, to: newState) else {
                logger.warning(
                    "Invalid transition",
                    context: [
                        "from": oldState.rawValue, "to": newState.rawValue,
                    ]
                )
                return
            }
            state = newState
            logger.debug(
                "State transition",
                context: [
                    "from": oldState.rawValue, "to": newState.rawValue,
                ]
            )
        }

        static func isValidTransition(
            from: VoiceState, to: VoiceState
        ) -> Bool {
            switch (from, to) {
            case (.idle, .listening),
                 (.listening, .processing),
                 (.listening, .speaking),
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

        func handleError(_ message: String) {
            error = message
            transition(to: .error)
            logger.error("Voice error: \(message)")

            Task {
                try? await Task.sleep(for: .seconds(3))
                await MainActor.run {
                    if self.state == .error {
                        self.transition(to: .idle)
                    }
                }
            }
        }

        func cancelAll() {
            recognitionStop?()
            recognitionStop = nil
            recognitionTask?.cancel()
            recognitionTask = nil
            safetyTimeoutTask?.cancel()
            safetyTimeoutTask = nil
            ttsService.stop()
            bargeInDetector.stopMonitoring()
            vadController.reset()
        }
    }
#endif
