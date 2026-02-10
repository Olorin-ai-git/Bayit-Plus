import BayitAuth
import BayitCore
import Foundation
import Observation

/// ViewModel for Live Dubbing - manages availability, voice selection, WebSocket connection,
/// and premium subscription requirements.
@Observable
final class LiveDubbingViewModel {
    private(set) var availability: DubbingAvailability?
    private(set) var voices: [DubbingVoice] = []
    private(set) var selectedVoice: DubbingVoice?
    private(set) var syncDelayMs: Int = 0
    private(set) var qualityTier: DubbingQualityTier?
    private(set) var isEnabled = false
    private(set) var isConnecting = false
    private(set) var selectedLanguage: String = "en"
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var overlayText: String?
    private(set) var translatedText: String?
    private(set) var showOverlay = false
    private(set) var isPremiumRequired = false

    let webSocketService: LiveDubbingWebSocketService
    private let repository: any LiveDubbingRepository
    private let authManager: AuthManager?
    private var overlayDismissTask: Task<Void, Never>?
    private let logger = BayitLogger(category: "LiveDubbing")
    private let overlayDuration: Duration = .seconds(4)

    init(
        repository: any LiveDubbingRepository,
        webSocketService: LiveDubbingWebSocketService,
        authManager: AuthManager? = nil
    ) {
        self.repository = repository
        self.webSocketService = webSocketService
        self.authManager = authManager
    }

    @MainActor
    func checkAvailability(channelId: String) async {
        isLoading = true
        error = nil

        do {
            availability = try await repository.checkAvailability(channelId: channelId)
            voices = availability?.availableVoices ?? []

            if let defaultVoiceId = availability?.defaultVoiceId {
                selectedVoice = voices.first { $0.id == defaultVoiceId }
            } else {
                selectedVoice = voices.first
            }

            if let defaultDelay = availability?.defaultSyncDelayMs {
                syncDelayMs = defaultDelay
            }

            logger.info("Dubbing availability loaded", context: [
                "channelId": channelId,
                "isAvailable": String(availability?.isAvailable ?? false),
                "voiceCount": String(voices.count)
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
        // Check premium subscription
        if let tier = authManager?.user?.subscriptionTier {
            let isPremium = tier == .premium || tier == .family
            if !isPremium {
                isPremiumRequired = true
                return
            }
        }

        if isEnabled {
            webSocketService.disconnect()
            isEnabled = false
            isConnecting = false
            showOverlay = false
            overlayDismissTask?.cancel()
        } else {
            isConnecting = true
            webSocketService.connect(
                channelId: channelId,
                targetLanguage: selectedLanguage,
                voiceId: selectedVoice?.id
            )
            isEnabled = true
            observeConnection()
        }
    }

    @MainActor
    func selectVoice(_ voice: DubbingVoice, channelId: String) {
        selectedVoice = voice
        if isEnabled {
            webSocketService.disconnect()
            webSocketService.connect(
                channelId: channelId,
                targetLanguage: selectedLanguage,
                voiceId: voice.id
            )
        }
    }

    @MainActor
    func selectLanguage(_ language: String, channelId: String) {
        selectedLanguage = language
        if isEnabled {
            webSocketService.disconnect()
            webSocketService.connect(
                channelId: channelId,
                targetLanguage: language,
                voiceId: selectedVoice?.id
            )
        }
    }

    @MainActor
    func updateSyncStatus(currentVideoTimeMs: Int) {
        webSocketService.sendSyncStatus(currentVideoTimeMs: currentVideoTimeMs)
    }

    @MainActor
    func handleConnectionInfo(_ info: DubbingConnectionMessage) {
        if let delay = info.syncDelayMs {
            syncDelayMs = delay
        }
        if let tierString = info.qualityTier,
           let tier = DubbingQualityTier(rawValue: tierString) {
            qualityTier = tier
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

    private func observeConnection() {
        Task { @MainActor in
            // Poll WebSocket isConnected until connected or disabled
            while isConnecting && isEnabled {
                if webSocketService.isConnected {
                    isConnecting = false
                    return
                }
                if webSocketService.error != nil {
                    isConnecting = false
                    return
                }
                try? await Task.sleep(for: .milliseconds(100))
            }
        }
    }

    @MainActor
    func dismissPremiumGate() {
        isPremiumRequired = false
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
