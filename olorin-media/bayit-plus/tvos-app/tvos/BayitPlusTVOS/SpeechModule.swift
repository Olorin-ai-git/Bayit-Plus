/**
 * SpeechModule - tvOS Speech Recognition Native Module
 *
 * Provides speech recognition capabilities using tvOS Speech framework
 * - Microphone permission handling (Siri Remote)
 * - Speech recognition permission handling
 * - Multi-language support (Hebrew, English, Spanish, French, Chinese, etc.)
 * - Real-time streaming recognition
 * - Integration with AudioCaptureModule for audio input
 *
 * Ported from iOS with tvOS-specific adaptations
 * Speech framework is only available on device, not simulator
 */

import Foundation
#if canImport(Speech)
import Speech
#endif
import AVFoundation
import React

@objc(SpeechModule)
class SpeechModule: RCTEventEmitter {

#if canImport(Speech)
  private var speechRecognizer: SFSpeechRecognizer?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
#endif
  private let audioEngine = AVAudioEngine()

  // MARK: - RCTEventEmitter

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return ["onSpeechRecognitionResult", "onSpeechRecognitionError"]
  }

  // MARK: - Event Emitter Methods for TurboModule

  @objc
  override func addListener(_ eventName: String) {
    // Required for TurboModule event support
  }

  @objc
  override func removeListeners(_ count: Double) {
    // Required for TurboModule event support
  }

  // MARK: - Permission Methods

  @objc func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                                reject: @escaping RCTPromiseRejectBlock) {
#if canImport(Speech)
    AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
      SFSpeechRecognizer.requestAuthorization { authStatus in
        DispatchQueue.main.async {
          let speechGranted = authStatus == .authorized
          let granted = micGranted && speechGranted
          resolve(["granted": granted])
        }
      }
    }
#else
    reject("UNAVAILABLE", "Speech recognition not available on this platform", nil)
#endif
  }

  @objc func checkPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                             reject: @escaping RCTPromiseRejectBlock) {
#if canImport(Speech)
    let micStatus = AVAudioSession.sharedInstance().recordPermission
    let speechStatus = SFSpeechRecognizer.authorizationStatus()

    resolve([
      "microphone": micStatus == .granted,
      "speech": speechStatus == .authorized
    ])
#else
    resolve(["microphone": false, "speech": false])
#endif
  }

  // MARK: - Recognition Methods

  @objc func setLanguage(_ languageCode: String,
                        resolve: @escaping RCTPromiseResolveBlock,
                        reject: @escaping RCTPromiseRejectBlock) {
#if canImport(Speech)
    let locale: Locale

    switch languageCode {
    case "he":
      locale = Locale(identifier: "he-IL")
    case "en":
      locale = Locale(identifier: "en-US")
    case "es":
      locale = Locale(identifier: "es-ES")
    case "fr":
      locale = Locale(identifier: "fr-FR")
    case "zh":
      locale = Locale(identifier: "zh-CN")
    case "ja":
      locale = Locale(identifier: "ja-JP")
    default:
      locale = Locale(identifier: "en-US")
    }

    if let recognizer = SFSpeechRecognizer(locale: locale) {
      speechRecognizer = recognizer
      resolve(["success": true, "locale": locale.identifier])
    } else {
      reject("LANGUAGE_NOT_SUPPORTED",
             "Language \(languageCode) not supported on tvOS",
             nil)
    }
#else
    reject("UNAVAILABLE", "Speech recognition not available on this platform", nil)
#endif
  }

  @objc func startListening(_ resolve: @escaping RCTPromiseResolveBlock,
                           reject: @escaping RCTPromiseRejectBlock) {
#if canImport(Speech)
    guard AVAudioSession.sharedInstance().recordPermission == .granted else {
      reject("PERMISSION_DENIED", "Microphone permission not granted", nil)
      return
    }

    guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
      reject("PERMISSION_DENIED", "Speech recognition permission not granted", nil)
      return
    }

    if recognitionTask != nil {
      recognitionTask?.cancel()
      recognitionTask = nil
    }

    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.record, mode: .measurement, options: [])
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      reject("AUDIO_SESSION_ERROR", "Failed to configure audio session: \(error)", nil)
      return
    }

    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest = recognitionRequest else {
      reject("RECOGNITION_ERROR", "Unable to create recognition request", nil)
      return
    }

    recognitionRequest.shouldReportPartialResults = true

    if speechRecognizer == nil {
      speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    }

    guard let speechRecognizer = speechRecognizer else {
      reject("RECOGNITION_ERROR", "Speech recognizer not available", nil)
      return
    }

    guard speechRecognizer.isAvailable else {
      reject("RECOGNITION_ERROR", "Speech recognizer not available on tvOS", nil)
      return
    }

    recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
      guard let self = self else { return }

      if let result = result {
        let transcription = result.bestTranscription.formattedString
        let isFinal = result.isFinal

        self.sendEvent(withName: "onSpeechRecognitionResult", body: [
          "transcription": transcription,
          "isFinal": isFinal,
          "confidence": result.bestTranscription.segments.last?.confidence ?? 0.0
        ])

        if isFinal {
          self.stopRecording()
        }
      }

      if let error = error {
        self.sendEvent(withName: "onSpeechRecognitionError", body: [
          "error": error.localizedDescription
        ])
        self.stopRecording()
      }
    }

    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)

    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
      recognitionRequest.append(buffer)
    }

    audioEngine.prepare()
    do {
      try audioEngine.start()
      resolve(["started": true])
    } catch {
      reject("AUDIO_ENGINE_ERROR", "Failed to start audio engine: \(error)", nil)
    }
#else
    reject("UNAVAILABLE", "Speech recognition not available on this platform", nil)
#endif
  }

  @objc func stopListening(_ resolve: @escaping RCTPromiseResolveBlock,
                          reject: @escaping RCTPromiseRejectBlock) {
    stopRecording()
    resolve(["stopped": true])
  }

  private func stopRecording() {
    audioEngine.stop()
    audioEngine.inputNode.removeTap(onBus: 0)
#if canImport(Speech)
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()
    recognitionTask = nil
#endif
  }
}
