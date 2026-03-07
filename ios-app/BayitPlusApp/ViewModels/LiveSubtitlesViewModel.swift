import BayitAuth
import BayitCore
import Foundation
import Observation

/// ViewModel for live subtitle translation - manages WebSocket lifecycle,
/// cue display timing, and premium subscription gating.
@MainActor
@Observable
final class LiveSubtitlesViewModel {
    var isEnabled = false
    var isConnecting = false
    var selectedLanguage: String = "en"
    var activeCueText: String = ""
    var originalCueText: String?
    var showOverlay = false
    var isSplitMode = false
    var error: String?
    var isPremiumRequired = false
    var isQuotaExceeded = false

    var byocStreamUrl: String?

    let webSocketService: LiveSubtitlesWebSocketService
    private let authManager: AuthManager?
    var cueDismissTask: Task<Void, Never>?
    var cueObserveTask: Task<Void, Never>?
    private let logger = BayitLogger(category: "LiveSubtitles")
    let cueDuration: Duration = .seconds(5)
    let sourceLang = "he"

    init(webSocketService: LiveSubtitlesWebSocketService, authManager: AuthManager? = nil) {
        self.webSocketService = webSocketService
        self.authManager = authManager
    }

    @MainActor
    func toggleSubtitles(channelId: String) {
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
            activeCueText = ""
            originalCueText = nil
            cueDismissTask?.cancel()
            cueObserveTask?.cancel()
        } else {
            isConnecting = true
            webSocketService.connect(
                channelId: channelId,
                targetLanguage: selectedLanguage,
                sourceLang: sourceLang,
                streamUrl: byocStreamUrl
            )
            isEnabled = true
            observeConnection()
            observeCues()
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
                sourceLang: sourceLang,
                streamUrl: byocStreamUrl
            )
            observeConnection()
        }
    }

    @MainActor
    func dismissPremiumGate() {
        isPremiumRequired = false
    }

    @MainActor
    func dismissQuotaExceeded() {
        isQuotaExceeded = false
        error = nil
    }

    @MainActor
    func cleanup() {
        cueDismissTask?.cancel()
        cueObserveTask?.cancel()
        if isEnabled {
            webSocketService.disconnect()
            isEnabled = false
        }
    }

    // MARK: - Private

    private func observeConnection() {
        Task { @MainActor in
            for await _ in observationStream({ [webSocketService] in
                _ = webSocketService.isConnected
                _ = webSocketService.error
            }) {
                guard isConnecting, isEnabled else { break }
                if webSocketService.isConnected {
                    isConnecting = false
                    return
                }
                if webSocketService.error != nil {
                    isConnecting = false
                    error = webSocketService.error
                    return
                }
            }
        }
    }

    private func observeCues() {
        cueObserveTask?.cancel()
        cueObserveTask = Task { @MainActor in
            var lastCueTimestamp: Double?
            var lastCueIsPartial: Bool?

            for await _ in observationStream({ [webSocketService] in
                _ = webSocketService.currentCue
                _ = webSocketService.isQuotaExceeded
            }) {
                guard isEnabled, !Task.isCancelled else { break }

                if webSocketService.isQuotaExceeded {
                    isQuotaExceeded = true
                    isEnabled = false
                    showOverlay = false
                    error = webSocketService.error
                    break
                }
                if let cue = webSocketService.currentCue,
                   cue.timestamp != lastCueTimestamp
                   || cue.isPartial != lastCueIsPartial
                {
                    lastCueTimestamp = cue.timestamp
                    lastCueIsPartial = cue.isPartial
                    handleCue(cue)
                }
            }
        }
    }

    /// Creates an AsyncStream that yields a value each time any @Observable property
    /// accessed inside `tracking` changes, replacing busy-wait polling with
    /// Observation-framework driven notifications.
    private func observationStream(
        _ tracking: @Sendable @escaping () -> Void
    ) -> AsyncStream<Void> {
        AsyncStream { continuation in
            @Sendable func observe() {
                withObservationTracking {
                    tracking()
                } onChange: {
                    continuation.yield()
                    Task { @MainActor in observe() }
                }
            }
            continuation.onTermination = { @Sendable _ in }
            observe()
        }
    }
}
