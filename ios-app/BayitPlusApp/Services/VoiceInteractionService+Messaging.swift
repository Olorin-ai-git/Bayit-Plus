#if os(iOS)
    import BayitCore
    import BayitNetworking
    import Foundation

    // MARK: - VoiceInteractionService Send & Receive

    extension VoiceInteractionService {
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

        func sendAudioData(_ data: Data) {
            guard let conn = connection else { return }
            isProcessing = true
            processingStage = "transcribing"

            // Encode audio data as base64 in a JSON message since
            // WebSocketConnection only supports text messages.
            let base64Audio = data.base64EncodedString()
            let audioMessage: [String: String] = [
                "type": "audio_data",
                "data": base64Audio,
            ]
            guard let jsonData = try? JSONSerialization.data(withJSONObject: audioMessage),
                  let text = String(data: jsonData, encoding: .utf8)
            else {
                isProcessing = false
                return
            }

            Task {
                do {
                    try await conn.send(message: text)
                } catch {
                    await MainActor.run {
                        self.logger.error("Failed to send audio", error: error)
                        self.isProcessing = false
                    }
                }
            }
        }

        func sendJSON(_ dict: [String: String]) {
            guard let conn = connection else { return }
            guard let data = try? JSONSerialization.data(withJSONObject: dict),
                  let text = String(data: data, encoding: .utf8)
            else { return }

            Task {
                do {
                    try await conn.send(message: text)
                } catch {
                    await MainActor.run {
                        self.logger.error("Failed to send message", error: error)
                    }
                }
            }
        }

        func startReceiving(connection: WebSocketConnection) {
            receiveTask = Task { [weak self] in
                let stream = await connection.receive()
                for await text in stream {
                    guard !Task.isCancelled else { break }
                    await self?.handleTextMessage(text)
                }

                await MainActor.run {
                    guard !Task.isCancelled else { return }
                    self?.isConnected = false
                }
            }
        }

        @MainActor
        func handleTextMessage(_ text: String) {
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = json["type"] as? String
            else { return }

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
    }
#endif
