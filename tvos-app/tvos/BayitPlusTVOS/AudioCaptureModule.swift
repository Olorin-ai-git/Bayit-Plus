/**
 * AudioCaptureModule - Native tvOS Audio Capture for Constant Listening
 *
 * This module provides native audio capture capabilities for the tvOS app,
 * enabling real-time audio level monitoring and voice activity detection
 * for the constant listening feature.
 */

import Foundation
import AVFoundation
import React

@objc(AudioCaptureModule)
class AudioCaptureModule: RCTEventEmitter {

    // MARK: - Properties

    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var isListening: Bool = false
    private var tempAudioFileURL: URL?
    private var audioBuffer: [Float] = []
    private let bufferLock = NSLock()

    // Configuration
    private let sampleRate: Double = 16000.0
    private let bufferSize: AVAudioFrameCount = 4096
    private let maxBufferDuration: TimeInterval = 30.0  // 30 seconds max

    // MARK: - RCTEventEmitter Setup

    override static func moduleName() -> String! {
        return "AudioCaptureModule"
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return [
            "onAudioLevel",
            "onSpeechDetected",
            "onSilenceDetected",
            "onError"
        ]
    }

    // MARK: - Public Methods

    @objc
    func startListening(_ resolve: @escaping RCTPromiseResolveBlock,
                        reject: @escaping RCTPromiseRejectBlock) {

        guard !isListening else {
            resolve(["status": "already_listening"])
            return
        }

        // Request microphone permission
        AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
            guard let self = self else { return }

            if !granted {
                reject("PERMISSION_DENIED", "Microphone permission denied", nil)
                return
            }

            DispatchQueue.main.async {
                do {
                    try self.setupAudioSession()
                    try self.setupAudioEngine()
                    try self.startAudioEngine()

                    self.isListening = true
                    resolve(["status": "listening"])
                } catch {
                    reject("START_ERROR", error.localizedDescription, error)
                }
            }
        }
    }

    @objc
    func stopListening(_ resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {

        guard isListening else {
            resolve(["status": "not_listening"])
            return
        }

        stopAudioEngine()
        isListening = false

        // Export audio buffer to file
        do {
            let filePath = try exportAudioBuffer()
            resolve([
                "status": "stopped",
                "audioFilePath": filePath ?? NSNull()
            ])
        } catch {
            reject("EXPORT_ERROR", error.localizedDescription, error)
        }
    }

    @objc
    func getAudioLevel(_ resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {

        bufferLock.lock()
        defer { bufferLock.unlock() }

        guard !audioBuffer.isEmpty else {
            resolve(["average": 0, "peak": 0])
            return
        }

        // Calculate RMS and peak from recent samples
        let recentSamples = Array(audioBuffer.suffix(1024))
        var sum: Float = 0
        var peak: Float = 0

        for sample in recentSamples {
            let abs = Swift.abs(sample)
            sum += sample * sample
            if abs > peak {
                peak = abs
            }
        }

        let rms = sqrt(sum / Float(recentSamples.count))

        resolve([
            "average": min(1.0, rms),
            "peak": min(1.0, peak)
        ])
    }

    @objc
    func clearBuffer(_ resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        bufferLock.lock()
        audioBuffer.removeAll()
        bufferLock.unlock()

        resolve(["status": "cleared"])
    }

    @objc
    func isCurrentlyListening(_ resolve: @escaping RCTPromiseResolveBlock,
                              reject: @escaping RCTPromiseRejectBlock) {
        resolve(["listening": isListening])
    }

    // MARK: - Private Methods

    private func setupAudioSession() throws {
        let session = AVAudioSession.sharedInstance()

        try session.setCategory(.record, mode: .measurement, options: [])
        try session.setPreferredSampleRate(sampleRate)
        try session.setPreferredIOBufferDuration(Double(bufferSize) / sampleRate)
        try session.setActive(true)
    }

    private func setupAudioEngine() throws {
        audioEngine = AVAudioEngine()

        guard let audioEngine = audioEngine else {
            throw NSError(domain: "AudioCapture", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to create audio engine"
            ])
        }

        inputNode = audioEngine.inputNode

        guard let inputNode = inputNode else {
            throw NSError(domain: "AudioCapture", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Failed to get input node"
            ])
        }

        // Configure input format
        let recordingFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: sampleRate,
            channels: 1,
            interleaved: true
        )

        guard let format = recordingFormat else {
            throw NSError(domain: "AudioCapture", code: 3, userInfo: [
                NSLocalizedDescriptionKey: "Failed to create audio format"
            ])
        }

        // Install tap for audio processing
        inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: format) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer)
        }
    }

    private func startAudioEngine() throws {
        guard let audioEngine = audioEngine else { return }

        audioEngine.prepare()
        try audioEngine.start()
    }

    private func stopAudioEngine() {
        audioEngine?.stop()
        inputNode?.removeTap(onBus: 0)
        audioEngine = nil
        inputNode = nil
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0] else { return }

        let frameLength = Int(buffer.frameLength)
        var samples = [Float](repeating: 0, count: frameLength)

        for i in 0..<frameLength {
            samples[i] = channelData[i]
        }

        // Calculate audio level
        var sum: Float = 0
        var peak: Float = 0

        for sample in samples {
            let abs = Swift.abs(sample)
            sum += sample * sample
            if abs > peak {
                peak = abs
            }
        }

        let rms = sqrt(sum / Float(frameLength))

        // Add to buffer (with size limit)
        bufferLock.lock()
        audioBuffer.append(contentsOf: samples)

        // Trim to max duration
        let maxSamples = Int(maxBufferDuration * sampleRate)
        if audioBuffer.count > maxSamples {
            audioBuffer.removeFirst(audioBuffer.count - maxSamples)
        }
        bufferLock.unlock()

        // Emit audio level event
        sendEvent(withName: "onAudioLevel", body: [
            "average": min(1.0, rms),
            "peak": min(1.0, peak)
        ])
    }

    private func exportAudioBuffer() throws -> String? {
        bufferLock.lock()
        let samples = audioBuffer
        audioBuffer.removeAll()
        bufferLock.unlock()

        guard !samples.isEmpty else { return nil }

        // Create temporary file
        let tempDir = FileManager.default.temporaryDirectory
        let fileName = "audio_\(Int(Date().timeIntervalSince1970)).wav"
        let fileURL = tempDir.appendingPathComponent(fileName)

        // Create WAV file
        try createWAVFile(at: fileURL, samples: samples)

        return fileURL.path
    }

    private func createWAVFile(at url: URL, samples: [Float]) throws {
        let audioFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: sampleRate,
            channels: 1,
            interleaved: true
        )!

        let audioFile = try AVAudioFile(
            forWriting: url,
            settings: audioFormat.settings,
            commonFormat: .pcmFormatFloat32,
            interleaved: true
        )

        let buffer = AVAudioPCMBuffer(
            pcmFormat: audioFormat,
            frameCapacity: AVAudioFrameCount(samples.count)
        )!

        buffer.frameLength = AVAudioFrameCount(samples.count)

        let channelData = buffer.floatChannelData![0]
        for (index, sample) in samples.enumerated() {
            channelData[index] = sample
        }

        try audioFile.write(from: buffer)
    }
}
