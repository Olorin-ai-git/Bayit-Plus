import Foundation

// MARK: - Observation & Cleanup

extension LiveDubbingViewModel {
    func observeConnection() {
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
                    return
                }
            }
        }
    }

    /// Creates an AsyncStream that yields a value each time any @Observable property
    /// accessed inside `tracking` changes, replacing busy-wait polling with
    /// Observation-framework driven notifications.
    func observationStream(
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
