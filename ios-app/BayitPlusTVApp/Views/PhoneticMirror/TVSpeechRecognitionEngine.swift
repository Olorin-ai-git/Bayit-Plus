#if os(tvOS)
import AVKit
import BayitCore
// NOTE: Speech framework not available on tvOS
// This file cannot be used as-is. Alternative implementation needed.
// import Speech // NOT AVAILABLE ON TVOS

@Observable
final class TVSpeechRecognitionEngine {
    private(set) var isListening = false
    private(set) var error: String?

    private var recognizer: SFSpeechRecognizer?
    private var engine: AVAudioEngine?
    private var recTask: SFSpeechRecognitionTask?
    private let logger = BayitLogger(category: "TVSpeechRecognitionEngine")

    func setup() {
        recognizer = SFSpeechRecognizer(locale: Locale(identifier: "he-IL"))
        engine = AVAudioEngine()
        SFSpeechRecognizer.requestAuthorization { status in
            self.logger.info("Speech authorization status: \(status.rawValue)")
        }
    }

    func startListening(
        localization: LocalizationManager,
        onTranscript: @escaping (String) -> Void
    ) {
        guard let recognizer = recognizer, recognizer.isAvailable,
              let engine = engine else {
            return
        }
        isListening = true

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = false

        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        do {
            try engine.start()
        } catch {
            self.error = localization.t("phoneticMirror.errors.audioEngine")
            return
        }

        recTask = recognizer.recognitionTask(with: request) { [weak self] result, err in
            if let result = result, result.isFinal {
                self?.stopListening()
                onTranscript(result.bestTranscription.formattedString)
            }
        }
    }

    func stopListening() {
        engine?.stop()
        engine?.inputNode.removeTap(onBus: 0)
        recTask?.cancel()
        recTask = nil
        isListening = false
    }

    func cleanup() {
        stopListening()
    }
}
#endif
