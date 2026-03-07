#if os(tvOS)
    import AVFoundation
    import BayitCore
    import Foundation

    public enum AudioRecordingError: Error, LocalizedError {
        case noInputAvailable

        public var errorDescription: String? {
            switch self {
            case .noInputAvailable:
                return "No microphone input available"
            }
        }
    }

    /// tvOS audio recording service using AVAudioEngine to capture from Siri Remote microphone.
    /// Sends recorded audio to backend transcription endpoint since Speech.framework
    /// is not available on tvOS.
    public final class TVAudioRecordingService: @unchecked Sendable {
        private var audioEngine: AVAudioEngine?
        private var audioData = Data()
        private let logger = BayitLogger(category: "TVAudioRecording")

        public var isRecording: Bool {
            audioEngine?.isRunning ?? false
        }

        public init() {}

        /// Start recording audio from the Siri Remote microphone.
        public func startRecording() throws {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            guard session.availableInputs?.isEmpty == false else {
                throw AudioRecordingError.noInputAvailable
            }

            let engine = AVAudioEngine()
            let inputNode = engine.inputNode
            let format = inputNode.outputFormat(forBus: 0)

            guard format.sampleRate > 0, format.channelCount > 0 else {
                throw AudioRecordingError.noInputAvailable
            }

            audioData = Data()

            inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) {
                [weak self] buffer, _ in
                guard let self else { return }
                if let channelData = buffer.floatChannelData?[0] {
                    let frameCount = Int(buffer.frameLength)
                    for i in 0 ..< frameCount {
                        let sample = Int16(max(-1, min(1, channelData[i])) * 32767)
                        var le = sample.littleEndian
                        self.audioData.append(
                            Data(bytes: &le, count: MemoryLayout<Int16>.size)
                        )
                    }
                }
            }

            engine.prepare()
            try engine.start()
            audioEngine = engine

            logger.info("Started recording from Siri Remote microphone", context: [:])
        }

        /// Stop recording and return the captured audio data.
        public func stopRecording() -> Data {
            audioEngine?.inputNode.removeTap(onBus: 0)
            audioEngine?.stop()

            try? AVAudioSession.sharedInstance().setActive(
                false, options: .notifyOthersOnDeactivation
            )

            let captured = audioData
            audioData = Data()
            audioEngine = nil

            logger.info(
                "Stopped recording",
                context: ["audioBytes": "\(captured.count)"]
            )
            return captured
        }

        /// Cancel recording without returning data.
        public func cancelRecording() {
            audioEngine?.inputNode.removeTap(onBus: 0)
            audioEngine?.stop()
            try? AVAudioSession.sharedInstance().setActive(
                false, options: .notifyOthersOnDeactivation
            )
            audioData = Data()
            audioEngine = nil
        }
    }
#endif
