#if os(tvOS)
    import BayitCore
    import Foundation
    import Observation

    /// ViewModel for the tvOS proactive suggestion banner.
    ///
    /// Text-only — no TTS, no haptics. Owns the ProactiveSuggestionEngine lifecycle
    /// and mirrors engine state to UI-facing properties using an observation loop.
    /// The engine polls the backend API; this ViewModel surfaces the current
    /// suggestion and manages auto-dismiss timing.
    @MainActor
    @Observable
    final class TVProactiveSuggestionViewModel {
        // MARK: - Public State

        private(set) var suggestion: ProactiveSuggestion?
        private(set) var isVisible = false

        // MARK: - Private

        private let engine: ProactiveSuggestionEngine
        private let logger = BayitLogger(category: "TVProactiveSuggestionViewModel")
        private var autoDismissTask: Task<Void, Never>?
        private var observationTask: Task<Void, Never>?
        private let autoDismissInterval: TimeInterval

        // MARK: - Init

        init(
            repository: any ProactiveSuggestionRepository,
            autoDismissInterval: TimeInterval = TVProactiveSuggestionViewModel.configuredAutoDismissInterval
        ) {
            engine = ProactiveSuggestionEngine(
                repository: repository,
                platform: "tvos"
            )
            self.autoDismissInterval = autoDismissInterval
        }

        // MARK: - Configuration

        private nonisolated static var configuredAutoDismissInterval: TimeInterval {
            if let value = ProcessInfo.processInfo.environment["PROACTIVE_AUTO_DISMISS_SECONDS"],
               let interval = TimeInterval(value)
            {
                return interval
            }
            return 30.0
        }

        // MARK: - Lifecycle

        func start(profileId: String?) {
            engine.start(profileId: profileId)
            startObservationLoop()
            logger.info("TV proactive suggestion started", context: ["profileId": profileId ?? "none"])
        }

        func stop() {
            observationTask?.cancel()
            observationTask = nil
            engine.stop()
            hideSuggestion()
            logger.info("TV proactive suggestion stopped")
        }

        // MARK: - Actions

        func execute() {
            guard let suggestion else { return }
            logger.info("Suggestion executed", context: [
                "id": suggestion.id,
                "contentId": suggestion.action?.payload?["contentId"] ?? "none",
            ])
            hideSuggestion()
            engine.dismissSuggestion()
        }

        func dismiss() {
            logger.info("Suggestion dismissed", context: ["id": suggestion?.id ?? "none"])
            hideSuggestion()
            engine.dismissSuggestion()
        }

        // MARK: - Private

        private func startObservationLoop() {
            observationTask?.cancel()
            observationTask = Task { [weak self] in
                while !Task.isCancelled {
                    guard let self else { return }
                    await self.syncEngineState()
                    try? await Task.sleep(nanoseconds: 500_000_000)
                }
            }
        }

        @MainActor
        private func syncEngineState() {
            if let newSuggestion = engine.currentSuggestion, suggestion?.id != newSuggestion.id {
                showSuggestion(newSuggestion)
            } else if engine.currentSuggestion == nil, suggestion != nil {
                hideSuggestion()
            }
        }

        private func showSuggestion(_ newSuggestion: ProactiveSuggestion) {
            suggestion = newSuggestion
            isVisible = true
            scheduleAutoDismiss()
        }

        private func hideSuggestion() {
            isVisible = false
            suggestion = nil
            autoDismissTask?.cancel()
            autoDismissTask = nil
        }

        private func scheduleAutoDismiss() {
            autoDismissTask?.cancel()
            autoDismissTask = Task { [weak self] in
                guard let self else { return }
                try? await Task.sleep(nanoseconds: UInt64(autoDismissInterval * 1_000_000_000))
                guard !Task.isCancelled else { return }
                await MainActor.run { self.dismiss() }
            }
        }

        /// Content ID from the current suggestion's action payload, if available.
        var actionContentId: String? {
            suggestion?.action?.payload?["contentId"]
        }

        /// Content type from the current suggestion's action payload, if available.
        var actionContentType: String? {
            suggestion?.action?.payload?["contentType"]
        }
    }
#endif
