import BayitCore
import Foundation

/// Extension on TriviaFactsViewModel providing live trivia WebSocket
/// connection, toggle, and disconnect logic.
extension TriviaFactsViewModel {
    @MainActor
    func toggleTrivia(
        channelId: String,
        language: String,
        webSocketService: LiveTriviaWebSocketService
    ) {
        if isEnabled {
            disconnectLiveTrivia()
        } else {
            isEnabled = true
            connectLiveTrivia(
                channelId: channelId,
                language: language,
                webSocketService: webSocketService
            )
        }
    }

    func connectLiveTrivia(channelId: String, language: String, webSocketService: LiveTriviaWebSocketService) {
        liveWebSocketService = webSocketService

        webSocketService.onFactReceived = { [weak self] fact in
            Task { @MainActor in
                self?.facts.append(fact)
                self?.displayFact(fact)
            }
        }

        webSocketService.onConnectionStatusChanged = { [weak self] status in
            Task { @MainActor in
                switch status {
                case .connected:
                    self?.isConnected = true
                case .disconnected, .error:
                    self?.isConnected = false
                case .connecting:
                    break
                }
            }
        }

        webSocketService.connect(channelId: channelId, targetLanguage: language)
    }

    func disconnectLiveTrivia() {
        liveWebSocketService?.disconnect()
        liveWebSocketService = nil
        isEnabled = false
        isConnected = false
    }

    /// Display a live-received fact (delegates to showFact for consistent behavior).
    @MainActor
    func displayFact(_ fact: TriviaFact) {
        showFact(fact)
    }
}
