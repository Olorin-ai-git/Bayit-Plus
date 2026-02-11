#if os(iOS)
import AVFoundation
import BayitCore
import Foundation
import Observation
import UIKit

/// ViewModel managing proactive voice suggestion display and TTS readout.
/// Available on iOS only. Depends on ProactiveSuggestionEngine from Services.
///
/// Coordinates between the ProactiveSuggestionEngine and the UI banner,
/// handling text-to-speech announcements, auto-dismiss timing, and user actions.
@MainActor
@Observable
final class ProactiveVoiceViewModel {

    // MARK: - Public State

    private(set) var suggestion: ProactiveSuggestion?
    private(set) var isVisible = false
    private(set) var isSpeaking = false

    // MARK: - Private

    private let engine: ProactiveSuggestionEngine
    private let synthesizer = AVSpeechSynthesizer()
    private let logger = BayitLogger(category: "ProactiveVoiceViewModel")
    private var autoDismissTask: Task<Void, Never>?
    private let autoDismissInterval: TimeInterval

    // MARK: - Init

    init(
        engine: ProactiveSuggestionEngine,
        autoDismissInterval: TimeInterval = ProactiveVoiceViewModel.configuredAutoDismissInterval
    ) {
        self.engine = engine
        self.autoDismissInterval = autoDismissInterval
    }

    // MARK: - Configuration

    private static var configuredAutoDismissInterval: TimeInterval {
        if let value = ProcessInfo.processInfo.environment["PROACTIVE_AUTO_DISMISS_SECONDS"],
           let interval = TimeInterval(value) {
            return interval
        }
        return 30.0
    }

    // MARK: - Lifecycle

    @MainActor
    func observeEngine() {
        if let newSuggestion = engine.currentSuggestion, suggestion?.id != newSuggestion.id {
            showSuggestion(newSuggestion)
        } else if engine.currentSuggestion == nil && suggestion != nil {
            hideSuggestion()
        }
    }

    @MainActor
    func start() {
        engine.start()
        logger.info("Proactive voice started")
    }

    @MainActor
    func stop() {
        engine.stop()
        hideSuggestion()
        stopSpeaking()
        logger.info("Proactive voice stopped")
    }

    // MARK: - Actions

    @MainActor
    func execute() {
        guard let suggestion else { return }
        logger.info("Suggestion executed", context: [
            "id": suggestion.id,
            "actionType": suggestion.action?.type?.rawValue ?? "none"
        ])
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        hideSuggestion()
        engine.dismissSuggestion()
    }

    @MainActor
    func dismiss() {
        logger.info("Suggestion dismissed", context: [
            "id": suggestion?.id ?? "none"
        ])
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        hideSuggestion()
        engine.dismissSuggestion()
    }

    @MainActor
    func speakSuggestion() {
        guard let message = suggestion?.message else { return }
        stopSpeaking()

        let utterance = AVSpeechUtterance(string: message)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        synthesizer.speak(utterance)
        isSpeaking = true

        logger.info("Speaking suggestion", context: ["message": message])
    }

    // MARK: - Private

    @MainActor
    private func showSuggestion(_ newSuggestion: ProactiveSuggestion) {
        suggestion = newSuggestion
        isVisible = true
        scheduleAutoDismiss()
        speakSuggestion()
    }

    @MainActor
    private func hideSuggestion() {
        isVisible = false
        suggestion = nil
        autoDismissTask?.cancel()
        autoDismissTask = nil
        stopSpeaking()
    }

    private func stopSpeaking() {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        isSpeaking = false
    }

    private func scheduleAutoDismiss() {
        autoDismissTask?.cancel()
        autoDismissTask = Task { [weak self] in
            guard let self else { return }
            try? await Task.sleep(nanoseconds: UInt64(autoDismissInterval * 1_000_000_000))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                self.dismiss()
            }
        }
    }

    /// The action route extracted from the current suggestion, if available.
    var actionRoute: String? {
        suggestion?.action?.payload?["route"]
    }
}
#endif
