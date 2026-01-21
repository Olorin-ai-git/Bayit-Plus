import Foundation
import Combine

/// Debouncer utility for delaying rapid updates
/// Prevents overwhelming BLE and TTS services with too many requests
class Debouncer {
    private var workItem: DispatchWorkItem?
    private let delay: TimeInterval
    private let queue: DispatchQueue

    /// Initialize debouncer
    /// - Parameters:
    ///   - delay: Delay in seconds before executing the action
    ///   - queue: Queue to execute the action on (default: main)
    init(delay: TimeInterval, queue: DispatchQueue = .main) {
        self.delay = delay
        self.queue = queue
    }

    /// Debounce an action
    /// - Parameter action: Closure to execute after delay
    func debounce(action: @escaping () -> Void) {
        workItem?.cancel()

        let newWorkItem = DispatchWorkItem(block: action)
        workItem = newWorkItem

        queue.asyncAfter(deadline: .now() + delay, execute: newWorkItem)
    }

    /// Cancel any pending debounced action
    func cancel() {
        workItem?.cancel()
        workItem = nil
    }
}

/// Combine publisher extension for debouncing
extension Publisher {
    /// Debounce publisher values
    /// - Parameters:
    ///   - interval: Time interval to wait
    ///   - scheduler: Scheduler to use (default: main)
    func debounce(for interval: TimeInterval, scheduler: DispatchQueue = .main) -> Publishers.Debounce<Self, DispatchQueue> {
        debounce(for: .seconds(interval), scheduler: scheduler)
    }
}
