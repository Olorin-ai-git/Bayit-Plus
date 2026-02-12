import AVFoundation
import BayitLocalization
import BayitNetworking
import Foundation
import SwiftUI

@Observable
class V2VPracticeViewModel {
    var practiceState: PracticeState = .idle
    var currentPhrase: V2VPracticePhrase?
    var phrases: [V2VPracticePhrase] = []
    var scoreBefore: Double = 0
    var scoreAfter: Double = 0
    var scoreDelta: Double = 0
    var latencyMs: Int = 0
    var isRecording = false
    var error: String?

    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    private var wsConnection: WebSocketConnection?
    private var receiveTask: Task<Void, Never>?

    enum PracticeState {
        case idle, recording, transforming, result
    }

    func setupAudio() {
        let session = AVAudioSession.sharedInstance()
        do {
            #if os(iOS)
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            #else
            try session.setCategory(.playAndRecord, mode: .default)
            #endif
            try session.setActive(true)
        } catch {
            self.error = "Audio session error"
        }
    }

    func startRecording() {
        guard practiceState == .idle else { return }

        let tempDir = FileManager.default.temporaryDirectory
        recordingURL = tempDir.appendingPathComponent("v2v_recording.wav")

        let recorderSettings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: recorderSettings)
            audioRecorder?.record()
            isRecording = true
            practiceState = .recording
        } catch {
            self.error = "Recording error"
        }
    }

    func stopRecording() -> Data? {
        audioRecorder?.stop()
        isRecording = false

        guard let url = recordingURL,
              let data = try? Data(contentsOf: url) else {
            return nil
        }

        try? FileManager.default.removeItem(at: url)
        return data
    }

    func submitForTransform(audioData: Data, avatarId: String) async {
        practiceState = .transforming

        guard let phrase = currentPhrase else {
            error = "No phrase selected"
            practiceState = .idle
            return
        }

        let audioBase64 = audioData.base64EncodedString()
        let payload: [String: Any] = [
            "type": "audio_chunk",
            "audio": audioBase64,
            "target_phrase": phrase.phraseHe,
            "avatar_id": avatarId
        ]

        do {
            if let jsonData = try? JSONSerialization.data(withJSONObject: payload),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                try await wsConnection?.send(message: jsonString)
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                practiceState = .idle
            }
        }
    }

    func handleV2VResult(_ data: [String: Any]) {
        scoreBefore = data["score_before"] as? Double ?? 0
        scoreAfter = data["score_after"] as? Double ?? 0
        scoreDelta = data["score_delta"] as? Double ?? 0
        latencyMs = data["latency_ms"] as? Int ?? 0
        practiceState = .result
    }

    func nextPhrase() {
        guard !phrases.isEmpty else { return }
        let currentIdx = phrases.firstIndex { $0.phraseHe == currentPhrase?.phraseHe } ?? -1
        let nextIdx = (currentIdx + 1) % phrases.count
        currentPhrase = phrases[nextIdx]
        resetState()
    }

    func retry() {
        resetState()
    }

    private func resetState() {
        scoreBefore = 0
        scoreAfter = 0
        scoreDelta = 0
        latencyMs = 0
        practiceState = .idle
    }

    func cleanup() {
        audioRecorder?.stop()
        audioRecorder = nil
        receiveTask?.cancel()
        receiveTask = nil
        if let conn = wsConnection {
            Task { await conn.disconnect() }
        }
        wsConnection = nil
    }
}
