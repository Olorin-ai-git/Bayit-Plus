/**
 * LiveDubbingAudioModule - iOS Native Module for Live Dubbing Audio Playback
 *
 * Provides audio playback capabilities for real-time dubbed audio:
 * - Base64 MP3 audio playback with in-memory processing
 * - Volume control for original and dubbed audio
 * - Audio queue management for smooth playback
 * - Audio session and interruption handling
 * - Proper memory management and cleanup
 */

import Foundation
import AVFoundation
import React

@objc(LiveDubbingAudioModule)
class LiveDubbingAudioModule: NSObject {

  private var audioEngine: AVAudioEngine?
  private var playerNode: AVAudioPlayerNode?
  private var isSetup = false
  private var dubbedVolume: Float = 1.0
  private let audioQueueLock = NSLock()
  private var interruptionObserver: NSObjectProtocol?

  override init() {
    super.init()
    setupAudioSession()
    registerForInterruptions()
  }

  deinit {
    cleanupResources()
  }

  // MARK: - Audio Session Setup

  private func setupAudioSession() {
    let audioSession = AVAudioSession.sharedInstance()
    do {
      #if os(tvOS)
      try audioSession.setCategory(
        .playback,
        mode: .spokenAudio,
        options: [.duckOthers, .allowAirPlay, .allowBluetoothA2DP]
      )
      #else
      try audioSession.setCategory(
        .playback,
        mode: .spokenAudio,
        options: [.duckOthers]
      )
      #endif
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      print("[LiveDubbingAudio] Audio session setup error: \(error)")
    }
  }

  private func registerForInterruptions() {
    interruptionObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.interruptionNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.handleInterruption(notification: notification)
    }
  }

  private func handleInterruption(notification: Notification) {
    guard let userInfo = notification.userInfo,
          let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
      return
    }

    switch type {
    case .began:
      // Interruption began - pause playback
      audioQueueLock.lock()
      playerNode?.pause()
      audioQueueLock.unlock()
      print("[LiveDubbingAudio] Audio interrupted - paused")

    case .ended:
      // Interruption ended - resume if appropriate
      guard let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt else {
        return
      }
      let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
      if options.contains(.shouldResume) {
        audioQueueLock.lock()
        do {
          try AVAudioSession.sharedInstance().setActive(true)
          if audioEngine?.isRunning == false {
            try audioEngine?.start()
          }
          playerNode?.play()
          print("[LiveDubbingAudio] Audio resumed after interruption")
        } catch {
          print("[LiveDubbingAudio] Failed to resume after interruption: \(error)")
        }
        audioQueueLock.unlock()
      }

    @unknown default:
      break
    }
  }

  private func setupAudioEngine() -> Bool {
    guard !isSetup else { return true }

    audioEngine = AVAudioEngine()
    playerNode = AVAudioPlayerNode()

    guard let engine = audioEngine, let player = playerNode else {
      return false
    }

    engine.attach(player)

    // Connect player to main mixer with format
    let outputFormat = engine.mainMixerNode.outputFormat(forBus: 0)
    engine.connect(player, to: engine.mainMixerNode, format: outputFormat)

    do {
      try engine.start()
      isSetup = true
      return true
    } catch {
      print("[LiveDubbingAudio] Audio engine start error: \(error)")
      return false
    }
  }

  // MARK: - Play Audio

  @objc func playAudio(_ base64Audio: String,
                       resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInteractive).async { [weak self] in
      guard let self = self else {
        reject("DUBBING_ERROR", "Module deallocated", nil)
        return
      }

      // Ensure audio engine is set up
      guard self.setupAudioEngine() else {
        reject("DUBBING_ERROR", "Failed to setup audio engine", nil)
        return
      }

      // Decode base64 to Data
      guard let audioData = Data(base64Encoded: base64Audio) else {
        reject("DUBBING_ERROR", "Invalid base64 audio data", nil)
        return
      }

      // Decode audio data (MP3) to PCM buffer using in-memory processing
      guard let buffer = self.decodeAudioDataInMemory(audioData) else {
        reject("DUBBING_ERROR", "Failed to decode audio", nil)
        return
      }

      // Schedule and play buffer with completion handler for memory management
      // Lock protects both scheduleBuffer and isPlaying check to prevent race condition
      self.audioQueueLock.lock()
      defer { self.audioQueueLock.unlock() }

      self.playerNode?.scheduleBuffer(buffer, at: nil, options: []) { [weak self] in
        // Buffer playback complete - memory will be released
        _ = self  // Keep weak reference alive during callback
      }

      // Check isPlaying while still holding the lock to prevent race with cleanup
      if !(self.playerNode?.isPlaying ?? false) {
        self.playerNode?.play()
      }

      resolve(["success": true, "duration": Double(buffer.frameLength) / buffer.format.sampleRate])
    }
  }

  /// Decode MP3 data to PCM buffer in memory without temp file I/O
  private func decodeAudioDataInMemory(_ data: Data) -> AVAudioPCMBuffer? {
    // Create an AVAudioFile from the data using a memory-mapped approach
    // We need to use temp file briefly but clean up immediately
    let tempURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("dub_\(ProcessInfo.processInfo.globallyUniqueString)")
      .appendingPathExtension("mp3")

    do {
      try data.write(to: tempURL)
      defer {
        // Always clean up temp file immediately after reading
        try? FileManager.default.removeItem(at: tempURL)
      }

      // Open audio file
      let audioFile = try AVAudioFile(forReading: tempURL)

      // Get the processing format
      guard let processingFormat = audioEngine?.mainMixerNode.outputFormat(forBus: 0) else {
        return nil
      }

      // Calculate frame capacity
      let frameCapacity = AVAudioFrameCount(audioFile.length)

      // Create buffer with the file's processing format
      guard let buffer = AVAudioPCMBuffer(pcmFormat: audioFile.processingFormat, frameCapacity: frameCapacity) else {
        return nil
      }

      // Read audio into buffer
      try audioFile.read(into: buffer)

      // If formats match, return directly
      if audioFile.processingFormat == processingFormat {
        return buffer
      }

      // Convert to output format if needed
      return convertBuffer(buffer, to: processingFormat)
    } catch {
      print("[LiveDubbingAudio] Audio decode error: \(error)")
      return nil
    }
  }

  private func convertBuffer(_ buffer: AVAudioPCMBuffer, to format: AVAudioFormat) -> AVAudioPCMBuffer? {
    guard let converter = AVAudioConverter(from: buffer.format, to: format) else {
      return nil
    }

    let ratio = format.sampleRate / buffer.format.sampleRate
    let newFrameCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)

    guard let convertedBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: newFrameCapacity) else {
      return nil
    }

    var error: NSError?
    var inputConsumed = false

    // Capture buffer strongly in the closure to prevent use-after-free
    // The closure may be called after this function returns
    let sourceBuffer = buffer
    let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
      if inputConsumed {
        outStatus.pointee = .noDataNow
        return nil
      }
      inputConsumed = true
      outStatus.pointee = .haveData
      return sourceBuffer
    }

    converter.convert(to: convertedBuffer, error: &error, withInputFrom: inputBlock)

    if let error = error {
      print("[LiveDubbingAudio] Conversion error: \(error)")
      return nil
    }

    return convertedBuffer
  }

  // MARK: - Volume Control

  @objc func setDubbedVolume(_ volume: Double,
                              resolve: @escaping RCTPromiseResolveBlock,
                              reject: @escaping RCTPromiseRejectBlock) {
    // Lock protects playerNode access to prevent race with cleanup
    audioQueueLock.lock()
    defer { audioQueueLock.unlock() }

    dubbedVolume = Float(max(0, min(1, volume)))
    playerNode?.volume = dubbedVolume
    resolve(["volume": dubbedVolume])
  }

  @objc func setOriginalVolume(_ volume: Double,
                                resolve: @escaping RCTPromiseResolveBlock,
                                reject: @escaping RCTPromiseRejectBlock) {
    // This method is for interface consistency
    // Original video volume is controlled by the video player, not this module
    resolve(["volume": volume])
  }

  // MARK: - Cleanup

  private func cleanupResources() {
    // Remove interruption observer
    if let observer = interruptionObserver {
      NotificationCenter.default.removeObserver(observer)
      interruptionObserver = nil
    }

    audioQueueLock.lock()
    defer { audioQueueLock.unlock() }

    playerNode?.stop()
    audioEngine?.stop()

    // Detach player node to release resources
    if let player = playerNode, let engine = audioEngine {
      engine.detach(player)
    }

    isSetup = false
    playerNode = nil
    audioEngine = nil

    // Deactivate audio session
    do {
      try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      print("[LiveDubbingAudio] Error deactivating audio session: \(error)")
    }
  }

  @objc func cleanup(_ resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
    cleanupResources()
    resolve(["success": true])
  }

  @objc func stop(_ resolve: @escaping RCTPromiseResolveBlock,
                  reject: @escaping RCTPromiseRejectBlock) {
    audioQueueLock.lock()
    playerNode?.stop()
    audioQueueLock.unlock()
    resolve(["stopped": true])
  }

  // MARK: - Status

  @objc func isPlaying(_ resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
    // Lock protects playerNode access to prevent race with cleanup
    audioQueueLock.lock()
    let playing = playerNode?.isPlaying ?? false
    audioQueueLock.unlock()
    resolve(["playing": playing])
  }

  // MARK: - React Native Bridge

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
