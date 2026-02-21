#if os(iOS)
    import AVFoundation
    import Foundation

    // MARK: - VoiceInteractionService Recording

    extension VoiceInteractionService {
        func startRecording() {
            guard !isRecording else { return }
            recordedData = Data()

            let engine = AVAudioEngine()
            let inputNode = engine.inputNode
            let format = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: 16000,
                channels: 1,
                interleaved: true
            )
            guard let format else { return }

            configureAudioSession()

            inputNode.installTap(
                onBus: 0,
                bufferSize: 4096,
                format: format
            ) { [weak self] buffer, _ in
                guard let self else { return }
                let data = buffer.toData()
                Task { @MainActor in
                    self.recordedData.append(data)
                }
            }

            do {
                try engine.start()
                audioEngine = engine
                isRecording = true
                logger.info("Audio recording started")
            } catch {
                logger.error("Failed to start audio engine", error: error)
            }
        }

        func stopRecording() {
            guard isRecording else { return }
            audioEngine?.inputNode.removeTap(onBus: 0)
            audioEngine?.stop()
            audioEngine = nil
            isRecording = false

            if !recordedData.isEmpty {
                sendAudioData(recordedData)
            }
            recordedData = Data()
            logger.info("Audio recording stopped")
        }

        func configureAudioSession() {
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(.playAndRecord, options: .defaultToSpeaker)
            try? session.setActive(true)
        }
    }

    // MARK: - AVAudioPCMBuffer Extension

    extension AVAudioPCMBuffer {
        func toData() -> Data {
            let channels = UnsafeBufferPointer(
                start: int16ChannelData,
                count: Int(format.channelCount)
            )
            guard let samples = channels.first else { return Data() }
            let count = Int(frameLength)
            return Data(bytes: samples, count: count * MemoryLayout<Int16>.size)
        }
    }
#endif
