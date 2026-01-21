/**
 * TTSModule - iOS Text-to-Speech Native Module
 *
 * Provides text-to-speech capabilities using iOS AVSpeechSynthesizer
 * - Multi-language support (Hebrew, English, Spanish)
 * - Speech rate control
 * - Pause/resume functionality
 * - Voice selection
 */

import Foundation
import AVFoundation
import React

@objc(TTSModule)
class TTSModule: NSObject {

  private var speechSynthesizer: AVSpeechSynthesizer?
  private var currentUtterance: AVSpeechUtterance?

  override init() {
    super.init()
    speechSynthesizer = AVSpeechSynthesizer()
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
    default:
      locale = "en-US"
    }

    let voices = AVSpeechSynthesisVoice.speechVoices()
      .filter { $0.language.starts(with: locale.prefix(2)) }
      .map { voice in
        var quality = "default"
        if voice.quality == .enhanced {
          quality = "enhanced"
        } else if #available(iOS 16.0, *) {
          if voice.quality == .premium {
            quality = "premium"
          }
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

  // MARK: - React Native Bridge

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
