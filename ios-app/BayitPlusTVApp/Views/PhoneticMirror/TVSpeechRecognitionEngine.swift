#if os(tvOS)
import AVKit
import BayitCore
import BayitLocalization

/// Speech framework is not available on tvOS.
/// This engine provides a no-op implementation; voice input on tvOS
/// should use backend-based transcription via the API instead.
@Observable
final class TVSpeechRecognitionEngine {
    private(set) var isListening = false
    private(set) var error: String?

    private let logger = BayitLogger(category: "TVSpeechRecognitionEngine")

    func setup() {
        logger.info("Speech recognition not available on tvOS")
    }

    func startListening(
        localization: LocalizationManager,
        onTranscript: @escaping (String) -> Void
    ) {
        error = localization.t("phoneticMirror.errors.speechUnavailable")
        logger.warning("Speech recognition not supported on tvOS")
    }

    func stopListening() {
        isListening = false
    }

    func cleanup() {
        stopListening()
    }
}
#endif
