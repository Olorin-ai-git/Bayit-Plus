import AVFoundation
import Combine

/// Audio engine service for capturing microphone input
/// Captures 16kHz mono PCM audio required by OpenAI Realtime API
class AudioEngine: ObservableObject {
    // MARK: - Published Properties

    /// Whether audio engine is currently running
    @Published private(set) var isRunning = false

    /// Current audio level (0.0 to 1.0) for waveform visualization
    @Published private(set) var audioLevel: Float = 0.0

    /// Error message if audio capture fails
    @Published private(set) var errorMessage: String?

    // MARK: - Private Properties

    private let audioEngine = AVAudioEngine()
    private var audioSession: AVAudioSession { AVAudioSession.sharedInstance() }

    /// Audio buffer callback closure
    var onAudioBuffer: ((AudioSample) -> Void)?

    // MARK: - Audio Format Constants

    private let sampleRate: Double = 16000.0  // Required by OpenAI
    private let channels: UInt32 = 1           // Mono
    private let bufferSize: AVAudioFrameCount = 4096  // 256ms at 16kHz

    // MARK: - Initialization

    init() {}

    // MARK: - Public Methods

    /// Start audio capture
    func start() async throws {
        guard !isRunning else { return }

        try await configureAudioSession()
        try configureAudioEngine()

        try audioEngine.start()

        await MainActor.run {
            isRunning = true
            errorMessage = nil
        }
    }

    /// Stop audio capture
    func stop() {
        guard isRunning else { return }

        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        Task { @MainActor in
            isRunning = false
            audioLevel = 0.0
        }
    }

    // MARK: - Permission

    /// Request microphone permission
    func requestPermission() async -> Bool {
        await withCheckedContinuation { continuation in
            audioSession.requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    /// Check if microphone permission is granted
    var hasPermission: Bool {
        audioSession.recordPermission == .granted
    }

    // MARK: - Private Methods

    /// Configure audio session for low-latency recording
    private func configureAudioSession() async throws {
        try audioSession.setCategory(
            .playAndRecord,
            mode: .measurement,
            options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
        )

        try audioSession.setPreferredSampleRate(sampleRate)
        try audioSession.setPreferredIOBufferDuration(Double(bufferSize) / sampleRate)
        try audioSession.setActive(true)
    }

    /// Configure audio engine with 16kHz mono PCM format
    private func configureAudioEngine() throws {
        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        // Create desired format: 16kHz, mono, PCM16
        guard let desiredFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: false
        ) else {
            throw AudioEngineError.formatCreationFailed
        }

        // Install tap on input node
        inputNode.installTap(
            onBus: 0,
            bufferSize: bufferSize,
            format: inputFormat
        ) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer, time: time, targetFormat: desiredFormat)
        }
    }

    /// Process audio buffer and convert to target format
    private func processAudioBuffer(
        _ buffer: AVAudioPCMBuffer,
        time: AVAudioTime,
        targetFormat: AVAudioFormat
    ) {
        guard let convertedBuffer = convertBuffer(buffer, to: targetFormat) else {
            return
        }

        // Create audio sample
        guard let sample = AudioSample(buffer: convertedBuffer) else {
            return
        }

        // Update audio level for visualization
        Task { @MainActor in
            self.audioLevel = sample.level
        }

        // Send buffer to callback
        onAudioBuffer?(sample)
    }

    /// Convert audio buffer to target format
    private func convertBuffer(
        _ buffer: AVAudioPCMBuffer,
        to targetFormat: AVAudioFormat
    ) -> AVAudioPCMBuffer? {
        guard let converter = AVAudioConverter(
            from: buffer.format,
            to: targetFormat
        ) else {
            return nil
        }

        let capacity = UInt32(
            Double(buffer.frameLength) * targetFormat.sampleRate / buffer.format.sampleRate
        )

        guard let convertedBuffer = AVAudioPCMBuffer(
            pcmFormat: targetFormat,
            frameCapacity: capacity
        ) else {
            return nil
        }

        var error: NSError?
        converter.convert(to: convertedBuffer, error: &error) { _, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }

        if let error = error {
            Task { @MainActor in
                self.errorMessage = "Conversion error: \(error.localizedDescription)"
            }
            return nil
        }

        return convertedBuffer
    }
}

// MARK: - Errors

enum AudioEngineError: LocalizedError {
    case formatCreationFailed
    case permissionDenied
    case audioSessionError(Error)

    var errorDescription: String? {
        switch self {
        case .formatCreationFailed:
            return "Failed to create audio format"
        case .permissionDenied:
            return "Microphone permission denied"
        case .audioSessionError(let error):
            return "Audio session error: \(error.localizedDescription)"
        }
    }
}
