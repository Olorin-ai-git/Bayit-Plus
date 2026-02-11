import BayitCore
import Foundation
import Observation

/// ViewModel for trivia facts - manages fact loading, active fact tracking, and auto-dismiss.
/// Available on iOS only. Depends on OfflineCacheService.
@MainActor
@Observable
final class TriviaFactsViewModel {
    private(set) var facts: [TriviaFact] = []
    private(set) var activeFact: TriviaFact?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isEnabled = false
    private(set) var isConnected = false

    private let repository: any TriviaRepository
    private let offlineCache: OfflineCacheService
    private var autoDismissTask: Task<Void, Never>?
    private let logger = BayitLogger(category: "TriviaFacts")
    private let displayWindow: TimeInterval = 30.0 // Configurable display window
    private var liveWebSocketService: LiveTriviaWebSocketService?

    init(repository: any TriviaRepository, offlineCache: OfflineCacheService) {
        self.repository = repository
        self.offlineCache = offlineCache
    }

    @MainActor
    func loadFacts(contentId: String, language: String?) async {
        isLoading = true
        error = nil

        let cacheKey = "trivia_\(contentId)_\(language ?? "default")"

        do {
            let response = try await repository.fetchTrivia(
                contentId: contentId,
                language: language ?? "en"
            )
            facts = response.trivia

            await offlineCache.save(response, forKey: cacheKey)

            logger.info("Trivia facts loaded", context: [
                "contentId": contentId,
                "factCount": String(facts.count)
            ])
        } catch {
            if let cached = await offlineCache.load(forKey: cacheKey, as: TriviaResponse.self) {
                facts = cached.trivia
                logger.info("Using cached trivia facts", context: ["contentId": contentId])
            } else {
                self.error = error.localizedDescription
                logger.error("Failed to load trivia facts", error: error, context: [
                    "contentId": contentId
                ])
            }
        }

        isLoading = false
    }

    @MainActor
    func updateActiveFact(currentTime: Double) {
        autoDismissTask?.cancel()

        let currentFact = facts.first { fact in
            guard let timestampStr = fact.timestamp,
                  let timestamp = Double(timestampStr) else { return false }
            let timeDiff = abs(currentTime - timestamp)
            return timeDiff <= displayWindow
        }

        if currentFact?.id != activeFact?.id {
            activeFact = currentFact

            if activeFact != nil {
                let duration: TimeInterval = 15.0
                autoDismissTask = Task {
                    try? await Task.sleep(for: .seconds(duration))
                    if !Task.isCancelled {
                        await self.dismissFact()
                    }
                }
            }
        }
    }

    @MainActor
    func dismissFact() {
        activeFact = nil
        autoDismissTask?.cancel()
    }

    @MainActor
    func cleanup() {
        autoDismissTask?.cancel()
        activeFact = nil
    }

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
        self.liveWebSocketService = webSocketService

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

    @MainActor
    private func displayFact(_ fact: TriviaFact) {
        activeFact = fact

        let duration: TimeInterval = 15.0
        autoDismissTask = Task {
            try? await Task.sleep(for: .seconds(duration))
            if !Task.isCancelled {
                await self.dismissFact()
            }
        }
    }
}
