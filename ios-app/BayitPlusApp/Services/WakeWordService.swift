import AVFoundation
import BayitCore
import Foundation
import Observation
import Speech
import UIKit

/// Service that listens for a configurable wake word using the iOS Speech framework.
///
/// Uses continuous on-device speech recognition to detect the wake phrase
/// (default "Hey Bayit"). Manages AVAudioSession, recognition tasks, and
/// enforces a configurable cooldown between activations.
@Observable
final class WakeWordService {

    // MARK: - Public State

    private(set) var isListening = false
    private(set) var isDetected = false
    private(set) var sensitivity: Double

    /// Closure invoked on the main actor when the wake word is detected.
    var onDetection: (() -> Void)?

    // MARK: - Private

    private let logger = BayitLogger(category: "WakeWordService")
    private let recognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private var cooldownActive = false
    private let wakePhrase: String
    private let cooldownInterval: TimeInterval

    // MARK: - Init

    init(
        locale: Locale = Locale(identifier: "en-US"),
        wakePhrase: String = WakeWordService.configuredWakePhrase,
        cooldownInterval: TimeInterval = WakeWordService.configuredCooldown,
        sensitivity: Double = WakeWordService.configuredSensitivity
    ) {
        self.recognizer = SFSpeechRecognizer(locale: locale)
        self.wakePhrase = wakePhrase.lowercased()
        self.cooldownInterval = cooldownInterval
        self.sensitivity = max(0.0, min(1.0, sensitivity))
    }

    // MARK: - Configuration from Environment

    private static var configuredWakePhrase: String {
        ProcessInfo.processInfo.environment["WAKE_WORD_PHRASE"] ?? "hey bayit"
    }

    private static var configuredCooldown: TimeInterval {
        if let value = ProcessInfo.processInfo.environment["WAKE_WORD_COOLDOWN_SECONDS"],
           let interval = TimeInterval(value) {
            return interval
        }
        return 3.0
    }

    private static var configuredSensitivity: Double {
        if let value = ProcessInfo.processInfo.environment["WAKE_WORD_SENSITIVITY"],
           let sens = Double(value) {
            return max(0.0, min(1.0, sens))
        }
        return 0.5
    }

    // MARK: - Public Methods

    func setSensitivity(_ value: Double) {
        sensitivity = max(0.0, min(1.0, value))
        logger.info("Sensitivity updated", context: ["sensitivity": "\(sensitivity)"])
    }

    @MainActor
    func startListening() {
        guard !isListening else { return }
        guard let recognizer, recognizer.isAvailable else {
            logger.error("Speech recognizer not available")
            return
        }

        do {
            try configureAudioSession()
            try startRecognition(recognizer: recognizer)
            isListening = true
            isDetected = false
            logger.info("Wake word listening started", context: [
                "wakePhrase": wakePhrase,
                "sensitivity": "\(sensitivity)"
            ])
        } catch {
            logger.error("Failed to start wake word listening", error: error)
        }
    }

    @MainActor
    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        isListening = false
        logger.info("Wake word listening stopped")
    }

    // MARK: - Private

    private func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }

    private func startRecognition(recognizer: SFSpeechRecognizer) throws {
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        self.recognitionRequest = request

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }

            if let result {
                let transcript = result.bestTranscription.formattedString.lowercased()
                if transcript.contains(self.wakePhrase) {
                    self.handleWakeWordDetected()
                }
            }

            if let error {
                Task { @MainActor in
                    self.logger.error("Recognition error", error: error)
                    if self.isListening {
                        self.stopListening()
                        try? await Task.sleep(nanoseconds: 500_000_000)
                        self.startListening()
                    }
                }
            }
        }
    }

    private func handleWakeWordDetected() {
        guard !cooldownActive else { return }
        cooldownActive = true

        Task { @MainActor in
            self.isDetected = true
            let generator = UIImpactFeedbackGenerator(style: .heavy)
            generator.impactOccurred()
            self.onDetection?()

            self.logger.info("Wake word detected", context: [
                "wakePhrase": self.wakePhrase
            ])

            self.stopListening()
        }

        Task {
            try? await Task.sleep(nanoseconds: UInt64(cooldownInterval * 1_000_000_000))
            cooldownActive = false
            Task { @MainActor in
                self.isDetected = false
            }
        }
    }
}
