#if os(iOS)
import BayitAuth
import BayitCore
import Foundation
import Observation

/// ViewModel for live subtitle translation - manages WebSocket lifecycle,
/// cue display timing, and premium subscription gating.
@Observable
final class LiveSubtitlesViewModel {
    private(set) var isEnabled = false
    private(set) var isConnecting = false
    private(set) var selectedLanguage: String = "en"
    private(set) var activeCueText: String = ""
    private(set) var originalCueText: String?
    private(set) var showOverlay = false
    private(set) var error: String?
    private(set) var isPremiumRequired = false
    private(set) var isQuotaExceeded = false

    let webSocketService: LiveSubtitlesWebSocketService
    private let authManager: AuthManager?
    private var cueDismissTask: Task<Void, Never>?
    private var cueObserveTask: Task<Void, Never>?
    private let logger = BayitLogger(category: "LiveSubtitles")
    private let cueDuration: Duration = .seconds(5)
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
                sourceLang: sourceLang
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
                sourceLang: sourceLang
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
            while isConnecting && isEnabled {
                if webSocketService.isConnected {
                    isConnecting = false
                    return
                }
                if webSocketService.error != nil {
                    isConnecting = false
                    error = webSocketService.error
                    return
                }
                try? await Task.sleep(for: .milliseconds(100))
            }
        }
    }

    private func observeCues() {
        cueObserveTask?.cancel()
        cueObserveTask = Task { @MainActor in
            var lastCueTimestamp: Double?
            var lastCueIsPartial: Bool?

            while isEnabled && !Task.isCancelled {
                if webSocketService.isQuotaExceeded {
                    isQuotaExceeded = true
                    isEnabled = false
                    showOverlay = false
                    error = webSocketService.error
                    break
                }
                if let cue = webSocketService.currentCue,
                   cue.timestamp != lastCueTimestamp
                    || cue.isPartial != lastCueIsPartial {
                    lastCueTimestamp = cue.timestamp
                    lastCueIsPartial = cue.isPartial
                    handleCue(cue)
                }
                try? await Task.sleep(for: .milliseconds(200))
            }
        }
    }

    @MainActor
    private func handleCue(_ cue: LiveSubtitleCueData) {
        if cue.isPartial == true {
            // Partial (pre-translation) cues only carry source-language text.
            // Update the original pane immediately; the translated pane waits
            // for the final subtitle so it never shows the wrong language.
            if let original = cue.originalText, !original.isEmpty {
                originalCueText = original
            }
        } else {
            activeCueText = cue.text ?? ""
            // Only update original if non-empty; translated text may produce
            // more chunks than the source, leaving trailing chunks with no
            // paired original text.
            if let original = cue.originalText, !original.isEmpty {
                originalCueText = original
            }
        }
        showOverlay = true

        cueDismissTask?.cancel()
        cueDismissTask = Task {
            try? await Task.sleep(for: cueDuration)
            if !Task.isCancelled {
                self.showOverlay = false
            }
        }
    }
}
#endif
