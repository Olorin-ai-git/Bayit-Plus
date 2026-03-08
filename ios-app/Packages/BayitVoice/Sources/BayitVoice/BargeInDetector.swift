#if os(iOS)
    import Accelerate
    import AVFoundation
    import BayitCore
    import Foundation

    // MARK: - Thread-Safe Barge-In State

    private final class BargeInState: @unchecked Sendable {
        private let lock = NSLock()
        private var _isMonitoring: Bool = false
        private var _speechOnsetTime: Date?

        var isMonitoring: Bool {
            lock.lock()
            defer { lock.unlock() }
            return _isMonitoring
        }

        var speechOnsetTime: Date? {
            lock.lock()
            defer { lock.unlock() }
            return _speechOnsetTime
        }

        func setMonitoring(_ value: Bool) {
            lock.lock()
            defer { lock.unlock() }
            _isMonitoring = value
        }

        func setSpeechOnset(_ date: Date?) {
            lock.lock()
            defer { lock.unlock() }
            _speechOnsetTime = date
        }

        func reset() {
            lock.lock()
            defer { lock.unlock() }
            _isMonitoring = false
            _speechOnsetTime = nil
        }
    }

    // MARK: - Barge-In Detector

    /// Detects user speech onset during TTS playback for barge-in interruption.
    ///
    /// Monitors microphone RMS power via AVAudioEngine. When sustained speech
    /// is detected above threshold for the debounce duration, fires the
    /// onBargeIn callback so the VoiceOrchestrator can interrupt TTS
    /// and transition to listening.
    public final class BargeInDetector {
        /// Callback fired when barge-in is detected (after debounce).
        /// Called on the main thread.
        public var onBargeIn: (() -> Void)?

        /// Whether the detector is currently monitoring.
        public var isMonitoring: Bool {
            state.isMonitoring
        }

        private let debounceInterval: TimeInterval
        private let rmsThreshold: Float
        private let audioEngine: AVAudioEngine
        private let logger: BayitLogger
        private let state = BargeInState()

        /// Create a barge-in detector.
        ///
        /// - Parameters:
        ///   - debounceMs: Duration in ms that speech must be sustained before
        ///     triggering barge-in. Prevents false triggers from transient noise.
        ///   - rmsDbThreshold: RMS power threshold in dBFS. Audio below this
        ///     level is treated as ambient noise and ignored.
        public init(debounceMs: Int = 300, rmsDbThreshold: Float = -30.0) {
            debounceInterval = TimeInterval(debounceMs) / 1000.0
            rmsThreshold = pow(10.0, rmsDbThreshold / 20.0)
            audioEngine = AVAudioEngine()
            logger = BayitLogger(category: "BargeInDetector")
        }

        /// Start monitoring microphone for speech onset.
        ///
        /// Configures the audio session for simultaneous playback and recording
        /// (.playAndRecord) so TTS audio continues while the mic is tapped.
        public func startMonitoring() {
            guard !state.isMonitoring else { return }

            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(
                    .playAndRecord,
                    mode: .voiceChat,
                    options: [.defaultToSpeaker, .allowBluetooth]
                )
                try session.setActive(true, options: .notifyOthersOnDeactivation)
            } catch {
                logger.error("Audio session setup failed", error: error)
                return
            }

            let inputNode = audioEngine.inputNode
            let format = inputNode.outputFormat(forBus: 0)

            inputNode.installTap(
                onBus: 0, bufferSize: 1024, format: format
            ) { [weak self] buffer, _ in
                self?.processAudioBuffer(buffer)
            }

            audioEngine.prepare()
            do {
                try audioEngine.start()
                state.setMonitoring(true)
                state.setSpeechOnset(nil)
                logger.info("Barge-in monitoring started")
            } catch {
                audioEngine.inputNode.removeTap(onBus: 0)
                logger.error("Audio engine start failed", error: error)
            }
        }

        /// Stop monitoring and tear down the audio tap.
        public func stopMonitoring() {
            guard state.isMonitoring else { return }
            tearDown()
            logger.info("Barge-in monitoring stopped")
        }

        // MARK: - Private

        private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
            guard let channelData = buffer.floatChannelData else { return }
            let frames = UInt(buffer.frameLength)
            guard frames > 0 else { return }

            var meanSquare: Float = 0
            vDSP_measqv(channelData[0], 1, &meanSquare, vDSP_Length(frames))
            let rms = sqrt(meanSquare)

            if rms > rmsThreshold {
                if state.speechOnsetTime == nil {
                    state.setSpeechOnset(Date())
                }
                if let onset = state.speechOnsetTime,
                   Date().timeIntervalSince(onset) >= debounceInterval
                {
                    DispatchQueue.main.async { [weak self] in
                        guard let self, self.state.isMonitoring else { return }
                        self.logger.info(
                            "Barge-in detected",
                            context: ["rms": String(format: "%.4f", rms)]
                        )
                        self.tearDown()
                        self.onBargeIn?()
                    }
                }
            } else {
                state.setSpeechOnset(nil)
            }
        }

        private func tearDown() {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
            state.reset()
        }

        deinit {
            if state.isMonitoring {
                audioEngine.stop()
                audioEngine.inputNode.removeTap(onBus: 0)
            }
        }
    }
#endif
