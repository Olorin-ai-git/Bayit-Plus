import BayitCore
import Foundation
import Observation

/// ViewModel for Live Dubbing - manages dubbing availability, language selection,
/// WebSocket connection, and overlay display for translated audio captions.
@Observable
final class LiveDubbingViewModel {
    private(set) var availability: DubbingAvailability?
    private(set) var isEnabled = false
    private(set) var selectedLanguage: String = "en"
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var overlayText: String?
    private(set) var translatedText: String?
    private(set) var showOverlay = false

    let webSocketService: LiveDubbingWebSocketService
    private let repository: any LiveDubbingRepository
    private var overlayDismissTask: Task<Void, Never>?
    private let logger = BayitLogger(category: "LiveDubbing")
    private let overlayDuration: Duration = .seconds(4)

    init(
        repository: any LiveDubbingRepository,
        webSocketService: LiveDubbingWebSocketService
    ) {
        self.repository = repository
        self.webSocketService = webSocketService
    }

    @MainActor
    func checkAvailability(channelId: String) async {
        isLoading = true
        error = nil

        do {
            availability = try await repository.checkAvailability(channelId: channelId)
            logger.info("Dubbing availability loaded", context: [
                "channelId": channelId,
                "isAvailable": String(availability?.isAvailable ?? false)
            ])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to check dubbing availability", error: error, context: [
                "channelId": channelId
            ])
        }

        isLoading = false
    }

    @MainActor
    func toggleDubbing(channelId: String) {
        if isEnabled {
            webSocketService.disconnect()
            isEnabled = false
            showOverlay = false
            overlayDismissTask?.cancel()
        } else {
            webSocketService.connect(channelId: channelId, targetLanguage: selectedLanguage)
            isEnabled = true
        }
    }

    @MainActor
    func selectLanguage(_ language: String, channelId: String) {
        selectedLanguage = language
        if isEnabled {
            webSocketService.disconnect()
            webSocketService.connect(channelId: channelId, targetLanguage: language)
        }
    }

    @MainActor
    func handleAudioMessage(_ message: DubbingAudioMessage) {
        overlayText = message.originalText
        translatedText = message.translatedText
        showOverlay = true

        overlayDismissTask?.cancel()
        overlayDismissTask = Task {
            try? await Task.sleep(for: overlayDuration)
            if !Task.isCancelled {
                self.showOverlay = false
            }
        }
    }

    @MainActor
    func cleanup() {
        overlayDismissTask?.cancel()
        if isEnabled {
            webSocketService.disconnect()
            isEnabled = false
        }
    }
}
