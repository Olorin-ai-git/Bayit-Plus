import BayitCore
import Foundation
import Observation
import SwiftUI

/// Service that monitors app scene phase to detect user presence.
/// Auto-pauses playback when the user leaves and manages WebSocket
/// lifecycle during app state transitions.
@Observable
final class PresenceDetectionService {

    enum PresenceState {
        case active
        case inactive
        case background
    }

    private(set) var state: PresenceState = .active
    private(set) var backgroundEnteredAt: Date?
    private(set) var totalBackgroundSeconds: TimeInterval = 0

    var onDidEnterBackground: (() -> Void)?
    var onDidBecomeActive: (() -> Void)?
    var onWebSocketReconnectNeeded: (() async -> Void)?
    var onWebSocketDisconnectAll: (() async -> Void)?

    private var gracePeriodTask: Task<Void, Never>?
    private let gracePeriod: TimeInterval
    private let logger = BayitLogger(category: "PresenceDetection")

    init(gracePeriod: TimeInterval) {
        self.gracePeriod = gracePeriod
    }

    /// Update presence state based on SwiftUI ScenePhase.
    func update(scenePhase: ScenePhase) {
        switch scenePhase {
        case .active:
            handleBecameActive()

        case .inactive:
            handleBecameInactive()

        case .background:
            handleEnteredBackground()

        @unknown default:
            break
        }
    }

    /// Duration the user has been in the background.
    /// Returns 0 if the user is currently active.
    var currentBackgroundDuration: TimeInterval {
        guard state == .background, let enteredAt = backgroundEnteredAt else {
            return 0
        }
        return Date().timeIntervalSince(enteredAt)
    }

    var isUserPresent: Bool {
        state == .active
    }

    // MARK: - Private State Handlers

    private func handleBecameActive() {
        gracePeriodTask?.cancel()
        gracePeriodTask = nil

        if state == .background, let enteredAt = backgroundEnteredAt {
            totalBackgroundSeconds += Date().timeIntervalSince(enteredAt)
        }
        backgroundEnteredAt = nil
        state = .active
        onDidBecomeActive?()

        logger.info("App became active, triggering WebSocket reconnection")
        Task {
            await onWebSocketReconnectNeeded?()
        }
    }

    private func handleBecameInactive() {
        state = .inactive

        gracePeriodTask?.cancel()
        gracePeriodTask = Task { [weak self] in
            guard let self else { return }
            do {
                try await Task.sleep(nanoseconds: UInt64(self.gracePeriod * 1_000_000_000))
                self.logger.info("Grace period expired while inactive, disconnecting WebSockets")
                await self.onWebSocketDisconnectAll?()
            } catch {
                self.logger.debug("Grace period timer cancelled")
            }
        }
    }

    private func handleEnteredBackground() {
        backgroundEnteredAt = Date()
        state = .background
        onDidEnterBackground?()

        gracePeriodTask?.cancel()
        gracePeriodTask = nil

        logger.info("App entered background, disconnecting all WebSockets")
        Task {
            await onWebSocketDisconnectAll?()
        }
    }
}
