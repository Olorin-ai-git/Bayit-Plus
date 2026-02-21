import AVFoundation
import BayitLocalization
import BayitNetworking
import Foundation
import SwiftUI

@MainActor
@Observable
final class V2VPracticeViewModel {
    var practiceState: PracticeState = .idle
    var currentPhrase: V2VPracticePhrase?
    var phrases: [V2VPracticePhrase] = []
    var scoreBefore: Double = 0
    var scoreAfter: Double = 0
    var scoreDelta: Double = 0
    var latencyMs: Int = 0
    var isRecording = false
    var isConnected = false
    var error: String?

    var audioRecorder: AVAudioRecorder?
    var recordingURL: URL?
    var wsConnection: WebSocketConnection?
    var receiveTask: Task<Void, Never>?
    var webSocketManager: WebSocketManager?

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

    @MainActor
    func connect(
        avatarId: String,
        manager: WebSocketManager,
        authToken: String
    ) async {
        webSocketManager = manager

        guard let wsURL = await buildWebSocketURL(
            avatarId: avatarId
        ) else {
            error = "Invalid WebSocket URL"
            return
        }

        do {
            let conn = try await manager.connect(to: wsURL, authToken: authToken)
            wsConnection = conn
            isConnected = true
            startReceiving(connection: conn)
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
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

    func stopRecording() async -> Data? {
        audioRecorder?.stop()
        isRecording = false

        guard let url = recordingURL else { return nil }

        return await Task.detached(priority: .userInitiated) {
            guard let data = try? Data(contentsOf: url) else { return nil as Data? }
            try? FileManager.default.removeItem(at: url)
            return data
        }.value
    }

    func submitForTransform(audioData: Data, avatarId _: String) async {
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
            "target_phrase_he": phrase.phraseHe,
        ]

        do {
            if let jsonData = try? JSONSerialization.data(withJSONObject: payload),
               let jsonString = String(data: jsonData, encoding: .utf8)
            {
                try await wsConnection?.send(message: jsonString)
            }
        } catch {
            await MainActor.run {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
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

    func resetState() {
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
        isConnected = false
    }
}
