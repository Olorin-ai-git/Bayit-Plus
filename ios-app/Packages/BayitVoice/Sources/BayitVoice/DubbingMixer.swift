import AVFoundation
import BayitCore
import Foundation

/// Real-time dubbing audio mixer using AVAudioEngine.
///
/// Ported from mobile-app/ios/BayitPlus/LiveDubbingAudioModule.swift.
/// Removes RCT bridge, converts to actor for thread safety, uses async/await.
/// Plays base64-encoded MP3 chunks over the original video audio with ducking.
public actor DubbingMixer {

    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var isSetup = false
    private var dubbedVolume: Float = 1.0
    private var interruptionObserver: NSObjectProtocol?
    private let logger = BayitLogger(category: "DubbingMixer")

    public init() {}

    deinit {
        // Cleanup is handled by stop() called before deallocation
    }

    // MARK: - Setup

    /// Configure the audio session for dubbing (spokenAudio + duckOthers).
    public func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            #if os(tvOS)
            try session.setCategory(
                .playback, mode: .spokenAudio,
                options: [.duckOthers, .allowAirPlay, .allowBluetoothA2DP]
            )
            #else
            try session.setCategory(
                .playback, mode: .spokenAudio, options: [.duckOthers]
            )
            #endif
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            logger.info("Audio session configured for dubbing")
        } catch {
            logger.error("Audio session setup failed", error: error)
        }
    }

    private func setupEngine() -> Bool {
        guard !isSetup else { return true }

        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()

        engine.attach(player)
        let outputFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        engine.connect(player, to: engine.mainMixerNode, format: outputFormat)

        do {
            try engine.start()
            audioEngine = engine
            playerNode = player
            isSetup = true
            registerInterruptions()
            logger.info("Audio engine started")
            return true
        } catch {
            logger.error("Audio engine start failed", error: error)
            return false
        }
    }

    // MARK: - Playback

    /// Play a base64-encoded MP3 audio chunk.
    ///
    /// - Parameter base64Audio: Base64-encoded MP3 data
    /// - Returns: Duration of the decoded audio in seconds
    /// - Throws: DubbingError if decoding or playback fails
    @discardableResult
    public func playAudio(_ base64Audio: String) throws -> Double {
        guard setupEngine() else {
            throw DubbingError.engineSetupFailed
        }
        guard let audioData = Data(base64Encoded: base64Audio) else {
            throw DubbingError.invalidBase64
        }
        guard let buffer = decodeMP3ToBuffer(audioData) else {
            throw DubbingError.decodeFailed
        }

        playerNode?.scheduleBuffer(buffer, at: nil, options: [])

        if !(playerNode?.isPlaying ?? false) {
            playerNode?.play()
        }

        let duration = Double(buffer.frameLength) / buffer.format.sampleRate
        return duration
    }

    // MARK: - Volume

    /// Set the dubbed audio volume (0.0 to 1.0).
    public func setDubbedVolume(_ volume: Float) {
        dubbedVolume = max(0, min(1, volume))
        playerNode?.volume = dubbedVolume
    }

    /// Get the current dubbed volume.
    public var volume: Float { dubbedVolume }

    /// Whether dubbed audio is currently playing.
    public var isPlaying: Bool { playerNode?.isPlaying ?? false }

    // MARK: - Stop / Cleanup

    /// Stop current playback without tearing down the engine.
    public func stopPlayback() {
        playerNode?.stop()
    }

    /// Full cleanup: stop engine, detach nodes, deactivate session.
    public func cleanup() {
        if let observer = interruptionObserver {
            NotificationCenter.default.removeObserver(observer)
            interruptionObserver = nil
        }

        playerNode?.stop()
        audioEngine?.stop()

        if let player = playerNode, let engine = audioEngine {
            engine.detach(player)
        }

        isSetup = false
        playerNode = nil
        audioEngine = nil

        do {
            try AVAudioSession.sharedInstance().setActive(
                false, options: .notifyOthersOnDeactivation
            )
        } catch {
            logger.error("Audio session deactivation failed", error: error)
        }
        logger.info("Dubbing mixer cleaned up")
    }

    // MARK: - MP3 Decoding

    /// Decode MP3 data to PCM buffer via temp file.
    /// Matches LiveDubbingAudioModule.decodeAudioDataInMemory logic.
    private func decodeMP3ToBuffer(_ data: Data) -> AVAudioPCMBuffer? {
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("dub_\(ProcessInfo.processInfo.globallyUniqueString)")
            .appendingPathExtension("mp3")

        do {
            try data.write(to: tempURL)
            defer { try? FileManager.default.removeItem(at: tempURL) }

            let audioFile = try AVAudioFile(forReading: tempURL)

            guard let outputFormat = audioEngine?.mainMixerNode.outputFormat(forBus: 0) else {
                return nil
            }

            let frameCapacity = AVAudioFrameCount(audioFile.length)
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: audioFile.processingFormat,
                frameCapacity: frameCapacity
            ) else {
                return nil
            }

            try audioFile.read(into: buffer)

            if audioFile.processingFormat == outputFormat {
                return buffer
            }
            return convertBuffer(buffer, to: outputFormat)
        } catch {
            logger.error("MP3 decode failed", error: error)
            return nil
        }
    }

    private func convertBuffer(
        _ buffer: AVAudioPCMBuffer,
        to format: AVAudioFormat
    ) -> AVAudioPCMBuffer? {
        guard let converter = AVAudioConverter(from: buffer.format, to: format) else {
            return nil
        }

        let ratio = format.sampleRate / buffer.format.sampleRate
        let newCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
        guard let converted = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: newCapacity) else {
            return nil
        }

        var error: NSError?
        let source = buffer
        var consumedFlag = false
        let lock = NSLock()

        let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
            lock.lock()
            let wasConsumed = consumedFlag
            consumedFlag = true
            lock.unlock()

            if wasConsumed {
                outStatus.pointee = .noDataNow
                return nil
            }
            outStatus.pointee = .haveData
            return source
        }

        converter.convert(to: converted, error: &error, withInputFrom: inputBlock)

        if let error {
            logger.error("Buffer conversion failed", error: error)
            return nil
        }
        return converted
    }

    // MARK: - Interruption Handling

    private func registerInterruptions() {
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self else { return }
            Task { await self.handleInterruption(notification) }
        }
    }

    private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            playerNode?.pause()
            logger.info("Dubbing interrupted - paused")
        case .ended:
            guard let opts = info[AVAudioSessionInterruptionOptionKey] as? UInt else { return }
            if AVAudioSession.InterruptionOptions(rawValue: opts).contains(.shouldResume) {
                do {
                    try AVAudioSession.sharedInstance().setActive(true)
                    if audioEngine?.isRunning == false {
                        try audioEngine?.start()
                    }
                    playerNode?.play()
                    logger.info("Dubbing resumed after interruption")
                } catch {
                    logger.error("Failed to resume after interruption", error: error)
                }
            }
        @unknown default:
            break
        }
    }
}

// MARK: - Errors

public enum DubbingError: Error, LocalizedError, Sendable {
    case engineSetupFailed
    case invalidBase64
    case decodeFailed

    public var errorDescription: String? {
        switch self {
        case .engineSetupFailed: return "Failed to setup audio engine"
        case .invalidBase64: return "Invalid base64 audio data"
        case .decodeFailed: return "Failed to decode audio"
        }
    }
}
