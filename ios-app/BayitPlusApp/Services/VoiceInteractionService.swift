#if os(iOS)
    import AVFoundation
    import BayitCore
    import Foundation
    import Observation

    /// Manages voice-based interaction with movie characters via WebSocket.
    /// Handles audio capture (AVAudioEngine), WebSocket transport, and playback.
    @MainActor
    @Observable
    final class VoiceInteractionService {
        // MARK: - Public State

        private(set) var isConnected = false
        private(set) var isRecording = false
        private(set) var isProcessing = false
        private(set) var processingStage: String?
        private(set) var lastTranscript: String?
        private(set) var connectionError: String?

        // MARK: - Private

        private var webSocketTask: URLSessionWebSocketTask?
        private var audioEngine: AVAudioEngine?
        private var recordedData = Data()
        private let logger = BayitLogger(category: "VoiceInteraction")
        private var receiveTask: Task<Void, Never>?

        // MARK: - Connect

        func connect(sessionId: String, token: String, wsBaseURL: String) {
            let wsPath = "/api/v1/ws/vod-interaction/\(sessionId)"
            guard let url = URL(string: "\(wsBaseURL)\(wsPath)") else {
                connectionError = "Invalid WebSocket URL"
                return
            }

            let session = URLSession(configuration: .default)
            webSocketTask = session.webSocketTask(with: url)
            webSocketTask?.resume()

            let authMessage: [String: String] = [
                "type": "authenticate",
                "token": token,
            ]
            sendJSON(authMessage)
            isConnected = true
            connectionError = nil
            startReceiving()
            logger.info("Voice WS connecting to session: \(sessionId)")
        }

        // MARK: - Disconnect

        func disconnect() {
            receiveTask?.cancel()
            receiveTask = nil
            webSocketTask?.cancel(with: .goingAway, reason: nil)
            webSocketTask = nil
            stopRecording()
            isConnected = false
            isProcessing = false
            processingStage = nil
            logger.info("Voice WS disconnected")
        }

        // MARK: - Recording

        func startRecording() {
            guard !isRecording else { return }
            recordedData = Data()

            let engine = AVAudioEngine()
            let inputNode = engine.inputNode
            let format = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: 16000,
                channels: 1,
                interleaved: true
            )
            guard let format else { return }

            configureAudioSession()

            inputNode.installTap(
                onBus: 0,
                bufferSize: 4096,
                format: format
            ) { [weak self] buffer, _ in
                guard let self else { return }
                let data = buffer.toData()
                Task { @MainActor in
                    self.recordedData.append(data)
                }
            }

            do {
                try engine.start()
                audioEngine = engine
                isRecording = true
                logger.info("Audio recording started")
            } catch {
                logger.error("Failed to start audio engine: \(error)")
            }
        }

        func stopRecording() {
            guard isRecording else { return }
            audioEngine?.inputNode.removeTap(onBus: 0)
            audioEngine?.stop()
            audioEngine = nil
            isRecording = false

            if !recordedData.isEmpty {
                sendAudioData(recordedData)
            }
            recordedData = Data()
            logger.info("Audio recording stopped")
        }

        // MARK: - Send

        func sendTextFallback(_ text: String) {
            let message: [String: String] = [
                "type": "text_message",
                "message": text,
            ]
            sendJSON(message)
        }

        func endSession() {
            let message = ["type": "end_session"]
            sendJSON(message)
        }

        // MARK: - Private Helpers

        private func sendAudioData(_ data: Data) {
            isProcessing = true
            processingStage = "transcribing"
            webSocketTask?.send(.data(data)) { [weak self] error in
                if let error {
                    Task { @MainActor in
                        self?.logger.error("Failed to send audio: \(error)")
                        self?.isProcessing = false
                    }
                }
            }
        }

        private func sendJSON(_ dict: [String: String]) {
            guard let data = try? JSONSerialization.data(withJSONObject: dict),
                  let text = String(data: data, encoding: .utf8) else { return }
            webSocketTask?.send(.string(text)) { [weak self] error in
                if let error {
                    Task { @MainActor in
                        self?.logger.error("Failed to send message: \(error)")
                    }
                }
            }
        }

        private func startReceiving() {
            receiveTask = Task { [weak self] in
                while !Task.isCancelled {
                    guard let ws = self?.webSocketTask else { break }
                    do {
                        let message = try await ws.receive()
                        self?.handleMessage(message)
                    } catch {
                        await MainActor.run {
                            self?.isConnected = false
                            self?.logger.error("WS receive error: \(error)")
                        }
                        break
                    }
                }
            }
        }

        private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
            guard case let .string(text) = message,
                  let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = json["type"] as? String else { return }

            switch type {
            case "processing":
                processingStage = json["stage"] as? String
            case "voice_result", "text_result":
                isProcessing = false
                processingStage = nil
                lastTranscript = json["transcript"] as? String
            case "error":
                isProcessing = false
                processingStage = nil
                connectionError = json["message"] as? String
            case "session_ended":
                disconnect()
            default:
                break
            }
        }

        private func configureAudioSession() {
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(.playAndRecord, options: .defaultToSpeaker)
            try? session.setActive(true)
        }
    }

    // MARK: - AVAudioPCMBuffer Extension

    private extension AVAudioPCMBuffer {
        func toData() -> Data {
            let channels = UnsafeBufferPointer(
                start: int16ChannelData,
                count: Int(format.channelCount)
            )
            guard let samples = channels.first else { return Data() }
            let count = Int(frameLength)
            return Data(bytes: samples, count: count * MemoryLayout<Int16>.size)
        }
    }
#endif
