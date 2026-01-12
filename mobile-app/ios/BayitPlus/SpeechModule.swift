/**
 * SpeechModule - iOS Speech Recognition Native Module
 *
 * Provides speech recognition capabilities using iOS Speech framework
 * - Microphone permission handling
 * - Speech recognition permission handling
 * - Multi-language support (Hebrew, English, Spanish)
 * - Real-time streaming recognition
 */

import Foundation
import Speech
import AVFoundation
import React

@objc(SpeechModule)
class SpeechModule: RCTEventEmitter {

  private var speechRecognizer: SFSpeechRecognizer?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private let audioEngine = AVAudioEngine()

  // MARK: - RCTEventEmitter

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["onSpeechRecognitionResult", "onSpeechRecognitionError"]
  }

  // MARK: - Permission Methods

  @objc func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                                reject: @escaping RCTPromiseRejectBlock) {
    // Request microphone permission
    AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
      // Request speech recognition permission
      SFSpeechRecognizer.requestAuthorization { authStatus in
        DispatchQueue.main.async {
          let speechGranted = authStatus == .authorized
          let granted = micGranted && speechGranted
          resolve(["granted": granted])
        }
      }
    }
  }

  @objc func checkPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                             reject: @escaping RCTPromiseRejectBlock) {
    let micStatus = AVAudioSession.sharedInstance().recordPermission
    let speechStatus = SFSpeechRecognizer.authorizationStatus()

    resolve([
      "microphone": micStatus == .granted,
      "speech": speechStatus == .authorized
    ])
  }

  // MARK: - Recognition Methods

  @objc func setLanguage(_ languageCode: String,
                        resolve: @escaping RCTPromiseResolveBlock,
                        reject: @escaping RCTPromiseRejectBlock) {
    let locale: Locale

    switch languageCode {
    case "he":
      locale = Locale(identifier: "he-IL")
    case "en":
      locale = Locale(identifier: "en-US")
    case "es":
      locale = Locale(identifier: "es-ES")
    default:
      locale = Locale(identifier: "en-US")
    }

    if let recognizer = SFSpeechRecognizer(locale: locale) {
      speechRecognizer = recognizer
      resolve(["success": true])
    } else {
      reject("LANGUAGE_NOT_SUPPORTED",
             "Language \(languageCode) not supported",
             nil)
    }
  }

  @objc func startListening(_ resolve: @escaping RCTPromiseResolveBlock,
                           reject: @escaping RCTPromiseRejectBlock) {
    // Check permissions first
    guard AVAudioSession.sharedInstance().recordPermission == .granted else {
      reject("PERMISSION_DENIED", "Microphone permission not granted", nil)
      return
    }

    guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
      reject("PERMISSION_DENIED", "Speech recognition permission not granted", nil)
      return
    }

    // Stop any ongoing recognition
    if recognitionTask != nil {
      recognitionTask?.cancel()
      recognitionTask = nil
    }

    // Configure audio session
    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      reject("AUDIO_SESSION_ERROR", "Failed to configure audio session: \(error)", nil)
      return
    }

    // Create recognition request
    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest = recognitionRequest else {
      reject("RECOGNITION_ERROR", "Unable to create recognition request", nil)
      return
    }

    recognitionRequest.shouldReportPartialResults = true

    // Get recognizer (default to English if not set)
    if speechRecognizer == nil {
      speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    }

    guard let speechRecognizer = speechRecognizer else {
      reject("RECOGNITION_ERROR", "Speech recognizer not available", nil)
      return
    }

    // Check availability
    guard speechRecognizer.isAvailable else {
      reject("RECOGNITION_ERROR", "Speech recognizer not available", nil)
      return
    }

    // Start recognition task
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

    // Configure audio engine
    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)

    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
      recognitionRequest.append(buffer)
    }

    // Start audio engine
    audioEngine.prepare()
    do {
      try audioEngine.start()
      resolve(["started": true])
    } catch {
      reject("AUDIO_ENGINE_ERROR", "Failed to start audio engine: \(error)", nil)
    }
  }

  @objc func stopListening(_ resolve: @escaping RCTPromiseResolveBlock,
                          reject: @escaping RCTPromiseRejectBlock) {
    stopRecording()
    resolve(["stopped": true])
  }

  private func stopRecording() {
    audioEngine.stop()
    audioEngine.inputNode.removeTap(onBus: 0)
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()
    recognitionTask = nil
  }
}
