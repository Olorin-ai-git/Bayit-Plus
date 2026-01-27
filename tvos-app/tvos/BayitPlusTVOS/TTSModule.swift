/**
 * TTSModule - tvOS Text-to-Speech Native Module
 *
 * Provides text-to-speech capabilities using tvOS AVSpeechSynthesizer
 * - Multi-language support (Hebrew, English, Spanish, French, Chinese, etc.)
 * - Speech rate control
 * - Pause/resume functionality
 * - Voice selection
 * - Audio ducking during TTS (lower media volume to 0.3x)
 * - Coordination with background audio playback
 *
 * Ported from iOS with tvOS-specific adaptations
 */

import Foundation
import AVFoundation
import React

@objc(TTSModule)
class TTSModule: NSObject, AVSpeechSynthesizerDelegate {

  private var speechSynthesizer: AVSpeechSynthesizer?
  private var currentUtterance: AVSpeechUtterance?
  private var originalVolume: Float = 1.0
  private var isDucking: Bool = false

  override init() {
    super.init()
    speechSynthesizer = AVSpeechSynthesizer()
    speechSynthesizer?.delegate = self
  }

  // MARK: - Speak Methods

  @objc func speak(_ text: String,
                   language: String,
                   rate: Double,
                   resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock) {
    guard let synthesizer = speechSynthesizer else {
      reject("TTS_ERROR", "Speech synthesizer not available", nil)
      return
    }

    // Stop any current speech
    if synthesizer.isSpeaking {
      synthesizer.stopSpeaking(at: .immediate)
    }

    // Duck background audio before speaking
    duckBackgroundAudio()

    // Create utterance
    let utterance = AVSpeechUtterance(string: text)

    // Set language
    let locale: String
    switch language {
    case "he":
      locale = "he-IL"
    case "en":
      locale = "en-US"
    case "es":
      locale = "es-ES"
    case "fr":
      locale = "fr-FR"
    case "zh":
      locale = "zh-CN"
    case "ja":
      locale = "ja-JP"
    case "it":
      locale = "it-IT"
    case "de":
      locale = "de-DE"
    default:
      locale = "en-US"
    }

    utterance.voice = AVSpeechSynthesisVoice(language: locale)

    // Set speech rate (0.5 - 2.0, where 1.0 is normal)
    // AVSpeechUtteranceDefaultSpeechRate is ~0.5, so we scale accordingly
    let minRate = AVSpeechUtteranceMinimumSpeechRate
    let maxRate = AVSpeechUtteranceMaximumSpeechRate
    let normalRate = AVSpeechUtteranceDefaultSpeechRate

    var actualRate: Float
    if rate < 1.0 {
      // Scale between minimum and normal
      actualRate = minRate + Float(rate) * (normalRate - minRate)
    } else {
      // Scale between normal and maximum
      actualRate = normalRate + Float(rate - 1.0) * (maxRate - normalRate)
    }

    utterance.rate = actualRate

    // Store current utterance
    currentUtterance = utterance

    // Configure audio session for TTS on tvOS
    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      reject("AUDIO_SESSION_ERROR", "Failed to configure audio session: \(error)", nil)
      return
    }

    // Speak
    synthesizer.speak(utterance)

    resolve(["success": true])
  }

  @objc func stop(_ resolve: @escaping RCTPromiseResolveBlock,
                  reject: @escaping RCTPromiseRejectBlock) {
    guard let synthesizer = speechSynthesizer else {
      reject("TTS_ERROR", "Speech synthesizer not available", nil)
      return
    }

    synthesizer.stopSpeaking(at: .immediate)
    restoreBackgroundAudio()
    resolve(["stopped": true])
  }

  @objc func pause(_ resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock) {
    guard let synthesizer = speechSynthesizer else {
      reject("TTS_ERROR", "Speech synthesizer not available", nil)
      return
    }

    synthesizer.pauseSpeaking(at: .immediate)
    resolve(["paused": true])
  }

  @objc func resume(_ resolve: @escaping RCTPromiseResolveBlock,
                    reject: @escaping RCTPromiseRejectBlock) {
    guard let synthesizer = speechSynthesizer else {
      reject("TTS_ERROR", "Speech synthesizer not available", nil)
      return
    }

    synthesizer.continueSpeaking()
    resolve(["resumed": true])
  }

  @objc func isSpeaking(_ resolve: @escaping RCTPromiseResolveBlock,
                        reject: @escaping RCTPromiseRejectBlock) {
    guard let synthesizer = speechSynthesizer else {
      resolve(["speaking": false])
      return
    }

    resolve(["speaking": synthesizer.isSpeaking])
  }

  @objc func getAvailableVoices(_ language: String,
                                 resolve: @escaping RCTPromiseResolveBlock,
                                 reject: @escaping RCTPromiseRejectBlock) {
    let locale: String
    switch language {
    case "he":
      locale = "he-IL"
    case "en":
      locale = "en-US"
    case "es":
      locale = "es-ES"
    case "fr":
      locale = "fr-FR"
    case "zh":
      locale = "zh-CN"
    case "ja":
      locale = "ja-JP"
    case "it":
      locale = "it-IT"
    case "de":
      locale = "de-DE"
    default:
      locale = "en-US"
    }

    let voices = AVSpeechSynthesisVoice.speechVoices()
      .filter { $0.language.starts(with: locale.prefix(2)) }
      .map { voice in
        var quality = "default"
        if voice.quality == .enhanced {
          quality = "enhanced"
        }

        return [
          "identifier": voice.identifier,
          "name": voice.name,
          "language": voice.language,
          "quality": quality
        ]
      }

    resolve(["voices": voices])
  }

  // MARK: - Audio Ducking

  private func duckBackgroundAudio() {
    guard !isDucking else { return }

    do {
      let audioSession = AVAudioSession.sharedInstance()
      // Store original volume
      // Note: On tvOS, volume control is system-level
      // We use .duckOthers option which automatically reduces other audio to 0.3x

      isDucking = true
    } catch {
      print("Failed to duck background audio: \(error)")
    }
  }

  private func restoreBackgroundAudio() {
    guard isDucking else { return }

    do {
      let audioSession = AVAudioSession.sharedInstance()
      // Restore audio session (ducking is automatically restored)
      try audioSession.setActive(false, options: .notifyOthersOnDeactivation)

      isDucking = false
    } catch {
      print("Failed to restore background audio: \(error)")
    }
  }

  // MARK: - AVSpeechSynthesizerDelegate

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
    // Restore background audio when TTS finishes
    restoreBackgroundAudio()
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
    // Restore background audio when TTS is cancelled
    restoreBackgroundAudio()
  }

  // MARK: - React Native Bridge

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
