#if os(iOS)
    import AVFoundation
    import BayitCore
    import Foundation
    import Speech

    // MARK: - Speech Recognition

    extension AvatarViewModel {
        func configureAudioSession() throws {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        }

        func startSpeechRecognition() throws {
            guard let speechRecognizer, speechRecognizer.isAvailable else {
                throw SpeechRecognitionError.recognizerUnavailable
            }

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
                        self?.currentTranscript = result.bestTranscription.formattedString
                    }
                }
            }
        }

        func stopRecognition() {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
            recognitionRequest?.endAudio()
            recognitionTask?.cancel()
            recognitionRequest = nil
            recognitionTask = nil
        }
    }

    // MARK: - Errors

    enum SpeechRecognitionError: LocalizedError {
        case recognizerUnavailable

        var errorDescription: String? {
            switch self {
            case .recognizerUnavailable:
                return "Speech recognizer is not available on this device"
            }
        }
    }
#endif
