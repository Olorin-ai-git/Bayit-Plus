#if os(tvOS)
import BayitCore
import Foundation
import Observation

/// Manages a sleep timer for tvOS that counts down and triggers a volume
/// fade-out before pausing playback. Uses absolute `Date` target timestamps
/// so the countdown survives app backgrounding.
@MainActor
@Observable
final class TVSleepTimerManager {

    // MARK: - Observable State

    private(set) var isActive = false
    private(set) var remainingSeconds = 0
    private(set) var selectedDurationMinutes: Int?

    // MARK: - Private State

    private var targetDate: Date?
    private var countdownTask: Task<Void, Never>?
    private var fadeTask: Task<Void, Never>?
    private let logger = BayitLogger(category: "TVSleepTimer")

    // MARK: - Constants

    static let timerStepMinutes = 5
    static let timerMinMinutes = 5
    static let timerMaxMinutes = 60
    private static let fadeSteps = 25
    private static let fadeStepMs: UInt64 = 200

    // MARK: - Timer Options

    var timerOptions: [Int] {
        stride(from: Self.timerMinMinutes, through: Self.timerMaxMinutes, by: Self.timerStepMinutes)
            .map { $0 }
    }

    // MARK: - Actions

    func start(
        durationMinutes: Int,
        fadeOutAction: @escaping (Float) async -> Void,
        completionAction: @escaping () async -> Void
    ) {
        cancel()

        let clamped = min(max(durationMinutes, Self.timerMinMinutes), Self.timerMaxMinutes)
        let target = Date().addingTimeInterval(TimeInterval(clamped * 60))
        targetDate = target
        selectedDurationMinutes = clamped
        remainingSeconds = clamped * 60
        isActive = true

        logger.info("TV sleep timer started", context: ["durationMinutes": "\(clamped)"])

        countdownTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                let now = Date()
                let remaining = max(0, Int(target.timeIntervalSince(now).rounded(.up)))
                self.remainingSeconds = remaining

                if remaining <= 0 {
                    self.isActive = false
                    self.selectedDurationMinutes = nil
                    await self.performFadeOut(fadeOutAction: fadeOutAction, completionAction: completionAction)
                    return
                }
                try? await Task.sleep(for: .seconds(1))
            }
        }
    }

    func extend(additionalMinutes: Int) {
        guard isActive, let target = targetDate else { return }
        let newTarget = target.addingTimeInterval(TimeInterval(additionalMinutes * 60))
        targetDate = newTarget
        remainingSeconds = max(0, Int(newTarget.timeIntervalSince(Date()).rounded(.up)))

        logger.info("TV sleep timer extended", context: ["additionalMinutes": "\(additionalMinutes)"])
    }

    func cancel() {
        countdownTask?.cancel()
        countdownTask = nil
        fadeTask?.cancel()
        fadeTask = nil
        isActive = false
        remainingSeconds = 0
        selectedDurationMinutes = nil
        targetDate = nil
    }

    // MARK: - Private

    private func performFadeOut(
        fadeOutAction: @escaping (Float) async -> Void,
        completionAction: @escaping () async -> Void
    ) async {
        logger.debug("TV sleep timer fade-out starting")

        for step in 1...Self.fadeSteps {
            if Task.isCancelled { return }
            let volume = 1.0 - (Float(step) / Float(Self.fadeSteps))
            await fadeOutAction(max(0, volume))
            try? await Task.sleep(for: .milliseconds(Self.fadeStepMs))
        }

        await fadeOutAction(0)
        await completionAction()
        logger.info("TV sleep timer completed, playback paused")
    }
}
#endif
