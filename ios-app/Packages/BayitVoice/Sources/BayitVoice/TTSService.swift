import AVFoundation
import BayitCore
import Foundation

/// Text-to-speech service using iOS AVSpeechSynthesizer.
///
/// Ported from mobile-app/ios/BayitPlus/TTSModule.swift.
/// Removes RCT bridge, converts to async/await.
@MainActor
public final class TTSService {

    private let synthesizer = AVSpeechSynthesizer()
    private let logger = BayitLogger(category: "TTS")

    public init() {}

    // MARK: - Speech

    /// Speak text in the given language at the specified rate.
    ///
    /// - Parameters:
    ///   - text: The text to speak
    ///   - language: ISO 639-1 code ("he", "en", "es")
    ///   - rate: Speech rate (0.5 = slow, 1.0 = normal, 2.0 = fast)
    public func speak(_ text: String, language: String, rate: Double = 1.0) {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: Self.locale(for: language))
        utterance.rate = Self.mapRate(rate)

        synthesizer.speak(utterance)
        logger.info("Speaking", context: ["language": language, "length": "\(text.count)"])
    }

    /// Stop any current speech immediately.
    public func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }

    /// Pause current speech.
    public func pause() {
        synthesizer.pauseSpeaking(at: .immediate)
    }

    /// Resume paused speech.
    public func resume() {
        synthesizer.continueSpeaking()
    }

    /// Whether the synthesizer is currently speaking.
    public var isSpeaking: Bool {
        synthesizer.isSpeaking
    }

    // MARK: - Voice Enumeration

    /// List available voices for a given language.
    public func availableVoices(for language: String) -> [TTSVoiceInfo] {
        let langPrefix = String(Self.locale(for: language).prefix(2))
        return AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language.hasPrefix(langPrefix) }
            .map { voice in
                TTSVoiceInfo(
                    id: voice.identifier,
                    name: voice.name,
                    language: voice.language,
                    quality: Self.mapQuality(from: voice)
                )
            }
    }

    // MARK: - Helpers

    private static func locale(for code: String) -> String {
        switch code {
        case "he": return "he-IL"
        case "es": return "es-ES"
        case "fr": return "fr-FR"
        case "zh": return "zh-CN"
        case "it": return "it-IT"
        case "ja": return "ja-JP"
        default: return "en-US"
        }
    }

    /// Map rate from 0.5-2.0 user range to AVSpeechUtterance rate range.
    /// Matches the algorithm in the original TTSModule.swift.
    private static func mapRate(_ rate: Double) -> Float {
        let minRate = AVSpeechUtteranceMinimumSpeechRate
        let maxRate = AVSpeechUtteranceMaximumSpeechRate
        let normalRate = AVSpeechUtteranceDefaultSpeechRate

        if rate < 1.0 {
            return minRate + Float(rate) * (normalRate - minRate)
        } else {
            return normalRate + Float(rate - 1.0) * (maxRate - normalRate)
        }
    }

    /// Infer voice quality from identifier since `AVSpeechSynthesisVoice.Quality`
    /// was removed in the iOS 26 SDK.
    private static func mapQuality(from voice: AVSpeechSynthesisVoice) -> TTSVoiceQuality {
        let id = voice.identifier.lowercased()
        if id.contains("premium") { return .premium }
        if id.contains("enhanced") { return .enhanced }
        return .standard
    }
}
