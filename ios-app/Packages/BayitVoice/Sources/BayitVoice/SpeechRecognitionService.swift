import AVFoundation
import BayitCore
import Foundation
import Speech

/// On-device speech recognition service using Apple's Speech.framework.
///
/// Ported from mobile-app/ios/BayitPlus/SpeechModule.swift.
/// Removes RCT bridge, uses AsyncStream for results, supports
/// multi-language (he-IL, en-US, es-ES).
public final class SpeechRecognitionService: Sendable {

    private let logger = BayitLogger(category: "SpeechRecognition")

    public init() {}

    // MARK: - Permissions

    /// Request both microphone and speech recognition permissions.
    public func requestPermissions() async -> VoicePermissions {
        let mic = await withCheckedContinuation { cont in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                cont.resume(returning: granted)
            }
        }

        let speech = await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { status in
                cont.resume(returning: status == .authorized)
            }
        }

        logger.info(
            "Permissions result",
            context: ["microphone": "\(mic)", "speech": "\(speech)"]
        )
        return VoicePermissions(microphone: mic, speechRecognition: speech)
    }

    /// Check current permission status without prompting.
    public func checkPermissions() -> VoicePermissions {
        let mic = AVAudioSession.sharedInstance().recordPermission == .granted
        let speech = SFSpeechRecognizer.authorizationStatus() == .authorized
        return VoicePermissions(microphone: mic, speechRecognition: speech)
    }

    // MARK: - Recognition

    /// Start streaming speech recognition, returning results as an AsyncStream.
    ///
    /// - Parameter language: ISO 639-1 code ("he", "en", "es")
    /// - Returns: AsyncStream of SpeechResult (partial and final)
    /// - Throws: If permissions are missing or the recognizer is unavailable
    public func startRecognition(
        language: String
    ) throws -> (stream: AsyncStream<SpeechResult>, stop: @Sendable () -> Void) {
        let permissions = checkPermissions()
        guard permissions.microphone else {
            throw SpeechError.microphonePermissionDenied
        }
        guard permissions.speechRecognition else {
            throw SpeechError.speechPermissionDenied
        }

        let locale = Self.locale(for: language)
        guard let recognizer = SFSpeechRecognizer(locale: locale),
              recognizer.isAvailable else {
            throw SpeechError.recognizerUnavailable(language)
        }

        let audioEngine = AVAudioEngine()
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true

        // Configure audio session for recording
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(
                .record, mode: .measurement, options: .duckOthers
            )
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            throw SpeechError.audioSessionFailed(error)
        }

        let loggerRef = self.logger

        // Build the async stream with a stop closure
        var continuation: AsyncStream<SpeechResult>.Continuation?
        let stream = AsyncStream<SpeechResult> { cont in
            continuation = cont

            // Start recognition task
            let task = recognizer.recognitionTask(with: request) { result, error in
                if let result {
                    let speechResult = SpeechResult(
                        transcription: result.bestTranscription.formattedString,
                        isFinal: result.isFinal,
                        confidence: result.bestTranscription.segments.last?.confidence ?? 0
                    )
                    cont.yield(speechResult)

                    if result.isFinal {
                        Self.stopEngine(audioEngine, request: request)
                        cont.finish()
                    }
                }
                if let error {
                    loggerRef.error("Recognition error", error: error)
                    Self.stopEngine(audioEngine, request: request)
                    cont.finish()
                }
            }

            cont.onTermination = { _ in
                task.cancel()
                Self.stopEngine(audioEngine, request: request)
            }
        }

        // Install audio tap and start engine
        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        audioEngine.prepare()
        do {
            try audioEngine.start()
            logger.info("Recognition started", context: ["language": language])
        } catch {
            throw SpeechError.audioEngineFailed(error)
        }

        let stop: @Sendable () -> Void = {
            Self.stopEngine(audioEngine, request: request)
            continuation?.finish()
        }

        return (stream, stop)
    }

    // MARK: - Helpers

    private static func locale(for code: String) -> Locale {
        switch code {
        case "he": return Locale(identifier: "he-IL")
        case "es": return Locale(identifier: "es-ES")
        case "fr": return Locale(identifier: "fr-FR")
        case "zh": return Locale(identifier: "zh-CN")
        case "it": return Locale(identifier: "it-IT")
        case "ja": return Locale(identifier: "ja-JP")
        default: return Locale(identifier: "en-US")
        }
    }

    private static func stopEngine(
        _ engine: AVAudioEngine,
        request: SFSpeechAudioBufferRecognitionRequest
    ) {
        engine.stop()
        engine.inputNode.removeTap(onBus: 0)
        request.endAudio()
    }
}

// MARK: - Errors

public enum SpeechError: Error, LocalizedError, Sendable {
    case microphonePermissionDenied
    case speechPermissionDenied
    case recognizerUnavailable(String)
    case audioSessionFailed(Error)
    case audioEngineFailed(Error)

    public var errorDescription: String? {
        switch self {
        case .microphonePermissionDenied:
            return "Microphone permission not granted"
        case .speechPermissionDenied:
            return "Speech recognition permission not granted"
        case .recognizerUnavailable(let lang):
            return "Speech recognizer unavailable for language: \(lang)"
        case .audioSessionFailed(let error):
            return "Audio session configuration failed: \(error.localizedDescription)"
        case .audioEngineFailed(let error):
            return "Audio engine start failed: \(error.localizedDescription)"
        }
    }
}
