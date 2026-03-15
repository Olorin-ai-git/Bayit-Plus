#if os(tvOS)
    import AVFoundation
    import BayitCore
    import BayitNetworking
    import Foundation
    import Observation

    struct TVHelpChatMessage: Identifiable {
        let id = UUID()
        let role: Role
        var text: String
        let timestamp = Date()

        enum Role { case user, assistant }
    }

    @MainActor
    @Observable
    final class TVHelpChatViewModel {
        private(set) var messages: [TVHelpChatMessage] = []
        private(set) var isSending = false
        private(set) var error: String?
        var conversationId: String?

        private let configuration: any EnvironmentConfiguration
        private let authTokenProvider: AuthTokenProvider
        private let language: String
        private let logger = BayitLogger(category: "HelpChat")
        private let synthesizer = AVSpeechSynthesizer()
        private var streamTask: Task<Void, Never>?

        init(
            configuration: any EnvironmentConfiguration,
            authTokenProvider: AuthTokenProvider,
            language: String
        ) {
            self.configuration = configuration
            self.authTokenProvider = authTokenProvider
            self.language = language
        }

        func send(message: String) {
            guard !message.trimmingCharacters(in: .whitespaces).isEmpty, !isSending else { return }
            messages.append(TVHelpChatMessage(role: .user, text: message))
            let assistantMsg = TVHelpChatMessage(role: .assistant, text: "")
            messages.append(assistantMsg)
            let assistantId = assistantMsg.id
            isSending = true
            error = nil

            streamTask = Task { [weak self] in
                guard let self else { return }
                do {
                    guard let token = try await authTokenProvider.currentToken() else {
                        self.setError("Not authenticated", id: assistantId)
                        return
                    }
                    let url = configuration.apiBaseURL
                        .appendingPathComponent("api/v1/support/chat/stream")
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    let body = SupportChatStreamRequest(
                        message: message,
                        language: language,
                        conversationId: conversationId
                    )
                    request.httpBody = try JSONEncoder().encode(body)

                    var accumulated = ""
                    let (bytes, _) = try await URLSession.shared.bytes(for: request)
                    for try await line in bytes.lines {
                        guard !Task.isCancelled else { break }
                        if line.hasPrefix("data: "),
                           let data = String(line.dropFirst(6)).data(using: .utf8),
                           let event = try? JSONDecoder().decode(SSEChunk.self, from: data)
                        {
                            switch event.type {
                            case "chunk":
                                accumulated += event.text ?? ""
                                self.updateMessage(id: assistantId, text: accumulated)
                            case "complete":
                                if let cid = event.conversationId { self.conversationId = cid }
                                self.speakText(accumulated)
                            default:
                                break
                            }
                        }
                    }
                } catch {
                    if !Task.isCancelled {
                        logger.error("Help chat stream error", context: ["error": error.localizedDescription])
                        self.setError(error.userFriendlyMessage ?? error.localizedDescription, id: assistantId)
                    }
                }
                self.isSending = false
            }
        }

        func cancel() {
            streamTask?.cancel()
            streamTask = nil
            isSending = false
            synthesizer.stopSpeaking(at: .immediate)
        }

        private func updateMessage(id: UUID, text: String) {
            if let idx = messages.firstIndex(where: { $0.id == id }) {
                messages[idx].text = text
            }
        }

        private func setError(_ msg: String, id: UUID) {
            updateMessage(id: id, text: "")
            error = msg
            isSending = false
        }

        private func speakText(_ text: String) {
            guard !text.isEmpty else { return }
            synthesizer.stopSpeaking(at: .immediate)
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = AVSpeechSynthesisVoice(language: language)
            utterance.rate = 0.52
            synthesizer.speak(utterance)
        }
    }

    private struct SupportChatStreamRequest: Encodable {
        let message: String
        let language: String
        let conversationId: String?
    }

    private struct SSEChunk: Decodable {
        let type: String
        let text: String?
        let conversationId: String?
    }
#endif
