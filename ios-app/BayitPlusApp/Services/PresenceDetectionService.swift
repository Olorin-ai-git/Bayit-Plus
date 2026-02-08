import Foundation
import Observation
import SwiftUI

/// Service that monitors app scene phase to detect user presence.
/// Auto-pauses playback when the user leaves and optionally
/// resumes when they return.
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

    /// Update presence state based on SwiftUI ScenePhase.
    func update(scenePhase: ScenePhase) {
        switch scenePhase {
        case .active:
            if state == .background, let enteredAt = backgroundEnteredAt {
                totalBackgroundSeconds += Date().timeIntervalSince(enteredAt)
            }
            backgroundEnteredAt = nil
            state = .active
            onDidBecomeActive?()

        case .inactive:
            state = .inactive

        case .background:
            backgroundEnteredAt = Date()
            state = .background
            onDidEnterBackground?()

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
}
